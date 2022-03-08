import { always, last } from 'rambda';
import type { BranchPolicies, PipelineStage, ReleasePipelineStats } from '../../../shared/types';
import { exists } from '../../utils';
import type { ParsedProjectConfig } from '../parse-config';
import type {
  Release, ReleaseCondition, EnvironmentStatus, ReleaseDefinition
} from '../types-azure';

const createCondition = (condition: ReleaseCondition) => ({
  type: condition.conditionType,
  name: condition.name
});

type EnvDetails = {
  name: string;
  conditions: {
    type: ReleaseCondition['conditionType'];
    name: string;
  }[];
  rank: number;
};

type PipelineDetails = {
  definitionId: number;
  name: string;
  url: string;
  envs: Record<number, EnvDetails>;
  attempts: {
    id: number;
    name: string;
    reposAndBranches: Readonly<{ repoId: string; repoName: string; branchName: string }>[];
    progression: {
      env: string;
      date: Date;
      rank: number;
      state: EnvironmentStatus;
    }[];
  }[];
};

const barePipeline = (release: Release): PipelineDetails => ({
  definitionId: release.releaseDefinition.id,
  name: release.releaseDefinition.name,
  url: release.releaseDefinition.url.replace('_apis/Release/definitions/', '_release?definitionId='),
  envs: {},
  attempts: []
});

const getArtifactDetails = (release: Release) => (
  release.artifacts.map(artifact => {
    const repoName = artifact.definitionReference.repository?.name;
    const repoId = artifact.definitionReference.repository?.id;
    const branch = artifact.definitionReference.branch?.name;
    if (!repoName) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { repoName, repoId, branchName: branch! };
  }).filter(exists)
);

export const aggregateReleasesIntoPipelines = (releases: Release[]) => {
  const combinedReleases = releases.reduce<Record<number, PipelineDetails>>((acc, release) => {
    acc[release.releaseDefinition.id] = acc[release.releaseDefinition.id] || barePipeline(release);

    acc[release.releaseDefinition.id].attempts.push({
      id: release.id,
      name: release.name,
      reposAndBranches: getArtifactDetails(release),
      progression: release.environments
        .filter(env => env.status !== 'notStarted')
        .map(env => ({
          env: env.name,
          rank: env.rank,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          date: last(env.deploySteps)!.lastModifiedOn,
          state: env.status
        }))
        .filter(exists)
        .sort((a, b) => a.rank - b.rank)
    });

    acc[release.releaseDefinition.id].envs = release.environments
      .reduce<Record<number, EnvDetails>>((acc, env) => {
        if (!acc[env.rank]) {
          acc[env.rank] = {
            name: env.name,
            conditions: env.conditions.map(createCondition),
            rank: env.rank
          };
        } else if (!acc[env.rank].conditions.length) {
          acc[env.rank].conditions = env.conditions.map(createCondition);
        }

        return acc;
      }, acc[release.releaseDefinition.id].envs);

    return acc;
  }, {});

  return Object.values(combinedReleases).map(release => {
    const { envs, ...rest } = release;

    return {
      ...rest,
      envs: Object.values(envs)
        .sort((a, b) => a.rank - b.rank)
    };
  });
};

const didAttemptGoAheadUsing = (
  pipeline: ReturnType<typeof aggregateReleasesIntoPipelines>[number],
  ignoreStagesBefore: string
) => {
  const lastMatchingStage: EnvDetails | undefined = last(pipeline.envs.filter(
    env => env.name.toLowerCase().includes(ignoreStagesBefore.toLowerCase())
  ));

  if (!lastMatchingStage) return always(true);

  return (attempt: (typeof pipeline)['attempts'][number]) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const attemptProgressionMaxRank = last(attempt.progression)!.rank;
    return attemptProgressionMaxRank > lastMatchingStage.rank;
  };
};

const getReposAndBranches = (
  pipeline: ReturnType<typeof aggregateReleasesIntoPipelines>[number],
  ignoreStagesBefore: string | undefined
) => {
  const didAttemptGoAhead = ignoreStagesBefore
    ? didAttemptGoAheadUsing(pipeline, ignoreStagesBefore)
    : always(true);

  const { repos, stageInfo } = pipeline.attempts.reduce<{
    repos: Record<string, { name: string; branches: Set<string>; additionalBranches: Set<string> }>;
    stageInfo: Map<number, { successful: number; total: number }>;
  }>((acc, attempt) => {
    const attemptWentAhead = didAttemptGoAhead(attempt);

    attempt.reposAndBranches.forEach(({ repoId, repoName, branchName }) => {
      acc.repos[repoId] = acc.repos[repoId] || {
        name: repoName,
        branches: new Set(),
        additionalBranches: new Set()
      };

      if (attemptWentAhead) {
        acc.repos[repoId].branches.add(branchName);
        acc.repos[repoId].additionalBranches.delete(branchName);
      } else if (!acc.repos[repoId].branches.has(branchName)) {
        acc.repos[repoId].additionalBranches.add(branchName);
      }
    });

    attempt.progression.forEach(stage => {
      const stageInfo = acc.stageInfo.get(stage.rank) || { successful: 0, total: 0 };

      stageInfo.total += 1;
      if (stage.state === 'succeeded') stageInfo.successful += 1;

      acc.stageInfo.set(stage.rank, stageInfo);
    });

    return acc;
  }, { repos: {}, stageInfo: new Map() });

  return {
    repos: Object.entries(repos).reduce<Record<string, { name: string; branches: string[]; additionalBranches?: string[] }>>(
      (acc, [repoId, { name, branches, additionalBranches }]) => {
        acc[repoId] = {
          name,
          branches: [...branches],
          additionalBranches: additionalBranches.size > 0 ? [...additionalBranches] : undefined
        };
        return acc;
      },
      {}
    ),
    stageCounts: pipeline.envs
      .filter(({ rank }) => stageInfo.has(rank))
      .sort((a, b) => a.rank - b.rank)
      .map(stage => ({
        name: stage.name,
        successful: stageInfo.get(stage.rank)?.successful || 0,
        total: stageInfo.get(stage.rank)?.total || 0
      }))
  };
};

export default (
  projectConfig: ParsedProjectConfig,
  releases: Release[],
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
): ReleasePipelineStats => {
  const { ignoreStagesBefore } = projectConfig.releasePipelines;
  const pipelines = aggregateReleasesIntoPipelines(releases)
    .map(pipeline => ({
      id: pipeline.definitionId,
      name: pipeline.name,
      url: pipeline.url,
      ...getReposAndBranches(pipeline, ignoreStagesBefore)
    }));

  const policies = pipelines.reduce<Record<string, Record<string, BranchPolicies>>>((acc, pipeline) => {
    Object.entries(pipeline.repos).forEach(([repoId, { branches, additionalBranches }]) => {
      [...branches, ...(additionalBranches || [])].forEach(branch => {
        acc[repoId] = acc[repoId] || {};
        acc[repoId][branch] = policyConfigurationByRepoId(repoId, branch);
      });
    });

    return acc;
  }, {});

  return { pipelines, policies };
};

export const formatReleaseDefinition = (releaseDefinition: ReleaseDefinition): PipelineStage[] => (
  releaseDefinition.environments
    .sort((a, b) => a.rank - b.rank)
    .map(env => ({
      name: env.name,
      rank: env.rank,
      conditions: env.conditions.map(createCondition)
    }))
);
