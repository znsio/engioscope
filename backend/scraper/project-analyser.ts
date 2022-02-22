import debug from 'debug';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/builds';
import aggregateBranches from './stats-aggregators/branches';
import aggregatePrs from './stats-aggregators/prs';
import aggregateReleases from './stats-aggregators/releases';
import aggregateCodeQuality from './stats-aggregators/code-quality';
import aggregateCommits from './stats-aggregators/commits';
import aggregatePolicyConfigurations from './stats-aggregators/policy-configurations';
import aggregateTestCases from './stats-aggregators/test-cases';
import sonar from './network/sonar';
import type { ProjectAnalysis, WorkItemAnalysis } from './types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import aggregateTestRuns from './stats-aggregators/test-runs';
import languageColors from './language-colors';
import type { RepoAnalysis } from '../../shared/types';
import addPipelinesToRepos from './stats-aggregators/add-pipelines-to-repos';
import type { GitBranchStats, WorkItemField } from './types-azure';

const getLanguageColor = (lang: string) => {
  if (lang in languageColors) return languageColors[lang as keyof typeof languageColors];
  if (lang === 'js') return languageColors.javascript;
  if (lang === 'xml') return languageColors.eiffel;
  return languageColors.eiffel;
};

const analyserLog = debug('analyser');

export default (config: ParsedConfig) => {
  const {
    getRepositories, getBuilds, getBranchesStats, getPRs, getCommits,
    getTestRuns, getTestCoverage, getReleases, getPolicyConfigurations,
    getProjectWorkItemIdsForQuery
  } = azure(config);
  const codeQualityByRepo = sonar(config);
  return async (
    collection: ParsedCollection,
    projectConfig: ParsedProjectConfig,
    getWorkItems: (projectConfig: ParsedProjectConfig, workItemFieldsPromise: Promise<WorkItemField[]>) => Promise<WorkItemAnalysis>,
    workItemFieldsPromise: Promise<WorkItemField[]>
  ): Promise<ProjectAnalysis> => {
    const startTime = Date.now();
    const forProject = <T>(fn: (c: string, p: string) => T): T => fn(collection.name, projectConfig.name);

    analyserLog(`Starting analysis for ${collection.name}/${projectConfig.name}`);
    const [
      repos,
      { buildsByRepoId, latestMasterBuilds },
      releases,
      prByRepoId,
      policyConfigurationByRepoBranch,
      workItemAnalysis,
      testCasesAnalysis
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds).then(aggregateBuilds),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config.azure.queryFrom)),
      forProject(getPolicyConfigurations).then(aggregatePolicyConfigurations),
      getWorkItems(projectConfig, workItemFieldsPromise),
      aggregateTestCases(forProject(getProjectWorkItemIdsForQuery), projectConfig.name)
    ]);

    const getTestsByRepoId = aggregateTestRuns(
      forProject(getTestRuns), forProject(getTestCoverage), latestMasterBuilds
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(repos.map(async r => {
      const branchStats = r.size === 0
        ? Promise.resolve([])
        : forProject(getBranchesStats)(r.id)
          .catch(e => {
            if (!(e instanceof Error)) throw e;
            if (!e.message.startsWith('HTTP error')) throw e;
            if (e.message.includes('400')) return [] as GitBranchStats[];
            throw e;
          });

      const [
        branches,
        tests,
        { languages, codeQuality },
        commits
      ] = await Promise.all([
        branchStats.then(aggregateBranches(r.webUrl, r.defaultBranch)),
        getTestsByRepoId(r.id),
        forProject(codeQualityByRepo)(r.name, r.defaultBranch).then(aggregateCodeQuality),
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

    const releaseAnalysis = aggregateReleases(projectConfig, releases, policyConfigurationByRepoBranch);

    const analysisResults: ProjectAnalysis = {
      repoAnalysis: addPipelinesToRepos(releaseAnalysis, repoAnalysis),
      releaseAnalysis,
      workItemAnalysis,
      workItemLabel: projectConfig.workitems.label,
      testCasesAnalysis
    };

    analyserLog(`Took ${Date.now() - startTime}ms to analyse ${collection.name}/${projectConfig.name}.`);

    return analysisResults;
  };
};
