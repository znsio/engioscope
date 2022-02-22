import qs from 'qs';
import { join } from 'path';
import glob from 'glob';
import { parse as parseHtml } from 'node-html-parser';
import { promises as fs } from 'fs';
import fetch from './fetch-with-timeout';
import { requiredMetrics } from '../stats-aggregators/code-quality';
import fetchWithDiskCache from './fetch-with-disk-cache';
import createPaginatedGetter from './create-paginated-getter';
import type { Measure, SonarAnalysisByRepo } from '../types-sonar';
import type { ParsedConfig, SonarConfig } from '../parse-config';
import { exists, normalizeBranchName, unique } from '../../utils';

export type SonarProject = {
  organization: string;
  id: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate: Date;
  url: string;
  token: string;
};

type SonarPaging = {
  pageIndex: number;
  pageSize: number;
};

const sortByLastAnalysedDate = (a: SonarProject, b: SonarProject) => (
  new Date(b.lastAnalysisDate).getTime() - new Date(a.lastAnalysisDate).getTime()
);

const normliseNameForMatching = (name: string) => (
  name.replace(/-/g, '_').toLowerCase()
);

const attemptExactMatchFind = (repoName: string, sonarProjects: SonarProject[]) => {
  const matchingProjects = sonarProjects
    .filter(project => (
      normliseNameForMatching(project.name) === normliseNameForMatching(repoName)
      && Boolean(project.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingProjects.length > 0 ? [matchingProjects[0]] : null;
};

const attemptStartsWithFind = (repoName: string, sonarProjects: SonarProject[]) => {
  const matchingProjects = sonarProjects
    .filter(project => (
      normliseNameForMatching(project.name).startsWith(normliseNameForMatching(repoName))
      && Boolean(project.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingProjects.length > 0 ? matchingProjects : null;
};

type SonarSearchResponse = { paging: SonarPaging; components: SonarProject[] };

const projectsAtSonarServer = (paginatedGet: ReturnType<typeof createPaginatedGetter>) => (sonarServer: SonarConfig) => (
  paginatedGet<SonarSearchResponse>({
    url: `${sonarServer.url}/api/projects/search`,
    cacheFile: pageIndex => ['sonar', 'projects', `${sonarServer.url.split('://')[1].replace(/\./g, '-')}-${pageIndex}`],
    headers: () => ({ Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString('base64')}` }),
    hasAnotherPage: previousResponse => previousResponse.data.paging.pageSize === previousResponse.data.components.length,
    qsParams: pageIndex => ({ ps: '500', p: (pageIndex + 1).toString() })
  })
    .then(responses => responses.map(response => response.data.components.map(c => ({
      ...c, url: sonarServer.url, token: sonarServer.token
    }))))
    .then(projects => projects.flat())
);

const getMeasures = (config: ParsedConfig) => (sonarProject: SonarProject) => {
  const { usingDiskCache } = fetchWithDiskCache(config.cacheTimeMs);

  return usingDiskCache<{ component?: { measures: Measure[] } }>(
    ['sonar', 'measures', sonarProject.key],
    () => fetch(`${sonarProject.url}/api/measures/component?${qs.stringify({
      component: sonarProject.key,
      metricKeys: requiredMetrics.join(',')
    })}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}`
      }
    })
  ).then(res => ({
    name: sonarProject.name,
    url: `${sonarProject.url}/dashboard?id=${sonarProject.name}`,
    measures: res.data.component?.measures || [],
    lastAnalysisDate: sonarProject.lastAnalysisDate
  }));
};

const getQualityGateName = (config: ParsedConfig) => (sonarProject: SonarProject) => {
  const { usingDiskCache } = fetchWithDiskCache(config.cacheTimeMs);

  return usingDiskCache<{ qualityGate: { name: string } }>(
    ['sonar', 'quality-gates', sonarProject.key],
    () => fetch(`${sonarProject.url}/api/qualitygates/get_by_project?${qs.stringify({
      project: sonarProject.key
    })}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}`
      }
    })
  ).then(res => res.data.qualityGate.name);
};

const parseSonarConfigFromHtmlFile = async (fileName: string) => {
  let htmlContent: string;

  try {
    htmlContent = await fs.readFile(fileName, 'utf-8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error parsing Sonar config from file', e);
    return null;
  }

  const root = parseHtml(htmlContent);
  const sonarHost = root.querySelector('#sonarHost')?.innerText;
  const sonarProjectKey = root.querySelector('#sonarProjectKey')?.innerText;

  if (sonarHost && sonarProjectKey) {
    return {
      sonarHost,
      sonarProjectKey
    };
  }

  return null;
};

const attemptMatchFromBuildReports = async (
  {
    collectionName, projectName, repoName, defaultBranch
  }: { collectionName: string; projectName: string; repoName: string; defaultBranch?: string},
  sonarProjects: SonarProject[]
) => {
  if (!defaultBranch) return null;

  const buildReportDir = join(process.cwd(), 'build-reports', collectionName, projectName, repoName);
  const matchingBuildReportFiles = glob.sync(join(buildReportDir, '**', `${normalizeBranchName(defaultBranch)}.html`));

  const sonarConfigs = (await Promise.all(matchingBuildReportFiles.map(parseSonarConfigFromHtmlFile))).filter(exists);
  const projectKeys = unique(sonarConfigs.map(({ sonarProjectKey }) => sonarProjectKey));
  const matchingSonarProjects = sonarProjects.filter(({ key }) => projectKeys.includes(key));

  return matchingSonarProjects.length ? matchingSonarProjects : null;
};

const attemptMatchByRepoName = (repoName: string, sonarProjects: SonarProject[]) => {
  const exactMatch = attemptExactMatchFind(repoName, sonarProjects);
  return exactMatch || attemptStartsWithFind(repoName, sonarProjects);
};

const getMatchingSonarProjects = async (
  repo: { collectionName: string; projectName: string; repoName: string; defaultBranch?: string },
  sonarProjects: SonarProject[]
) => {
  const sonarProjectsFromBuildReports = await attemptMatchFromBuildReports(repo, sonarProjects);
  return sonarProjectsFromBuildReports || attemptMatchByRepoName(repo.repoName, sonarProjects);
};

export default (config: ParsedConfig) => {
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs);

  const sonarProjects = Promise.all((config.sonar || []).map(projectsAtSonarServer(paginatedGet)))
    .then(list => list.flat());

  return (
    collectionName: string, projectName: string
  ) => async (repoName: string, defaultBranch?: string): Promise<SonarAnalysisByRepo> => {
    const matchingSonarProjects = await getMatchingSonarProjects({
      collectionName, projectName, repoName, defaultBranch
    }, await sonarProjects);

    if (!matchingSonarProjects) return null;

    return Promise.all(matchingSonarProjects.map(sonarProject => (
      Promise.all([
        getMeasures(config)(sonarProject),
        getQualityGateName(config)(sonarProject)
      ]).then(([measures, qualityGateName]) => ({
        ...measures,
        qualityGateName
      }))
    )));
  };
};
