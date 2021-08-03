import debug from 'debug';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/builds';
import aggregateBranches from './stats-aggregators/branches';
import aggregatePrs from './stats-aggregators/prs';
import aggregateReleases from './stats-aggregators/releases';
import aggregateCodeQuality from './stats-aggregators/code-quality';
import aggregateCommits from './stats-aggregators/commits';
import aggregateReleaseDefinitions from './stats-aggregators/release-definitions';
import aggregateWorkItems from './stats-aggregators/work-items';
import sonar from './network/sonar';
import { Config, ProjectAnalysis } from './types';
import aggregateTestRunsByBuildId from './stats-aggregators/test-runs';
import languageColors from './language-colors';
import { RepoAnalysis } from '../../shared/types';
import { pastDate } from '../utils';
import { WorkItemQueryHierarchialResult, WorkItemQueryResult } from './types-azure';

const dayInMs = 24 * 60 * 60 * 1000;

const getLanguageColor = (lang: string) => {
  if (lang in languageColors) return languageColors[lang as keyof typeof languageColors];
  if (lang === 'js') return languageColors.javascript;
  if (lang === 'xml') return languageColors.eiffel;
  return languageColors.eiffel;
};

const analyserLog = debug('analyser');

const createQuery = (config: Config) => {
  const daysToLookup = Math.round(
    (Date.now() - pastDate(config.azure.lookAtPast).getTime()) / dayInMs
  );

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE 
      [Source].[System.TeamProject] = @project
      AND [Source].[System.WorkItemType] = '${config.azure.groupWorkItemsUnder}'
      AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
      AND [Source].[System.ChangedDate] >= @today-${daysToLookup}
    ORDER BY [Source].[System.CreatedDate] ASC
  `;
};

export default (config: Config) => {
  const {
    getRepositories, getBuilds, getBranchesStats, getPRs, getCommits,
    getTestRuns, getTestCoverage, getReleases, getReleaseDefinitions,
    getWorkItemIdsForQuery, getWorkItems, getWorkItemRevisions
  } = azure(config);
  const codeQualityByRepoName = sonar(config);

  return async (collectionName: string, projectName: string): Promise<ProjectAnalysis> => {
    const startTime = Date.now();
    const forProject = <T>(fn: (c: string, p: string) => T): T => fn(collectionName, projectName);

    analyserLog(`Starting analysis for ${collectionName}/${projectName}`);
    const [
      repos,
      { buildsByRepoId, latestMasterBuilds },
      testRunGetter,
      releaseDefinitionById,
      releases,
      prByRepoId,
      workItemIdTree
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds).then(aggregateBuilds),
      forProject(getTestRuns).then(aggregateTestRunsByBuildId),
      forProject(getReleaseDefinitions).then(aggregateReleaseDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(pastDate(config.azure.lookAtPast))),
      config.azure.groupWorkItemsUnder
        ? forProject(getWorkItemIdsForQuery)(createQuery(config)) as Promise<WorkItemQueryResult<WorkItemQueryHierarchialResult>>
        : null
    ]);

    const getTestsByRepoId = testRunGetter(
      latestMasterBuilds, forProject(getTestCoverage)
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(repos.map(async r => {
      const [
        branches,
        tests,
        { languages, codeQuality },
        commits
      ] = await Promise.all([
        (r.size === 0 ? Promise.resolve([]) : forProject(getBranchesStats)(r.id))
          .then(aggregateBranches(r.webUrl, r.defaultBranch)),
        getTestsByRepoId(r.id),
        codeQualityByRepoName(r.name).then(aggregateCodeQuality),
        forProject(getCommits)(r.id).then(aggregateCommits)
      ]);

      return {
        name: r.name,
        id: r.id,
        url: r.webUrl,
        defaultBranch: (r.defaultBranch || '').replace('refs/heads/', ''),
        languages: languages?.map(l => ({ ...l, color: getLanguageColor(l.lang) })),
        commits,
        builds: buildsByRepoId(r.id),
        branches,
        prs: prByRepoId(r.id),
        tests,
        codeQuality
      };
    }));

    const analysisResults = {
      repoAnalysis,
      releaseAnalysis: aggregateReleases(releaseDefinitionById, releases),
      workItemAnalysis: workItemIdTree === null
        ? null
        : await aggregateWorkItems(workItemIdTree, forProject(getWorkItems), forProject(getWorkItemRevisions))
    };

    analyserLog(`Took ${Date.now() - startTime}ms to analyse ${collectionName}/${projectName}.`);

    return analysisResults;
  };
};
