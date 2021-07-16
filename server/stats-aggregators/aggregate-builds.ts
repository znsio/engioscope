/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Build } from '../azure-types';
import { TopLevelIndicator } from '../../shared-types';
import ratingConfig from '../rating-config';
import {
  assertDefined, isMaster, minutes, statsStrings
} from '../utils';
import { withOverallRating } from './ratings';

type BuildStats = {
  count: number,
  success: number,
  duration: number[]
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = { count: 0, success: 0, duration: [] };
const [timeRange, averageTime] = statsStrings('-', minutes);

const topLevelIndicator = (stats: BuildStats): TopLevelIndicator => withOverallRating({
  name: 'Builds',
  count: stats.count,
  indicators: [
    {
      name: 'Total successful',
      value: stats.success,
      rating: ratingConfig.builds.successful(stats.success)
    },
    {
      name: 'Number of executions',
      value: stats.count,
      rating: ratingConfig.builds.numberOfExecutions(stats.count)
    },
    {
      name: 'Success rate',
      value: `${stats.count === 0 ? 0 : Math.round((stats.success * 100) / stats.count)}%`,
      rating: ratingConfig.builds.successRate(stats.count === 0 ? 0 : Math.round((stats.success * 100) / stats.count))
    },
    {
      name: 'Average duration',
      value: averageTime(stats.duration),
      rating: ratingConfig.builds.averageDuration(stats.duration),
      additionalValue: timeRange(stats.duration)
    }
  ]
});

const combineStats = (
  incoming: BuildStats,
  existing = defaultBuildStats
) => ({
  count: existing.count + incoming.count,
  success: existing.success + incoming.success,
  duration: [...existing.duration, ...incoming.duration]
});

// TODO: remove eslint-disable Not sure why eslint is messing up the indentation onSave
/* eslint-disable @typescript-eslint/indent */
export default (builds: Build[]) => {
  type AggregatedBuilds = {
    buildsById: Record<string, Build>;
    buildStats: Record<string, BuildStats>;
    latestMasterBuildIds: Record<string, Record<number, number | undefined>>
  };

  const { buildsById, buildStats, latestMasterBuildIds } = builds
    .reduce<AggregatedBuilds>((acc, build) => {
      const rId = repoId(build);

      if (rId === '6d224167-b8ea-4121-8fcb-672ab3d4b599' && build.id === 53956) {
        console.log({ build, acc });
      }

      return {
        buildsById: {
          ...acc.buildsById,
          [build.id!]: build
        },
        buildStats: {
          ...acc.buildStats,
          [rId]: combineStats({
            count: 1,
            success: build.result === 'succeeded' ? 1 : 0,
            duration: [(new Date(build.finishTime!)).getTime() - (new Date(build.startTime!).getTime())]
          }, acc.buildStats[rId])
        },
        latestMasterBuildIds: {
          ...acc.latestMasterBuildIds,
          [rId]: {
            ...acc.latestMasterBuildIds[rId],
            [build.definition.id]:
              // eslint-disable-next-line no-nested-ternary
              acc.latestMasterBuildIds[rId] && acc.latestMasterBuildIds[rId][build.definition.id]
                ? acc.latestMasterBuildIds[rId][build.definition.id]
                : isMaster(build.sourceBranch) ? build.id : undefined
          }
        }
      };
  }, { buildsById: {}, buildStats: {}, latestMasterBuildIds: {} });

  return {
    buildByBuildId: (id?: number) => (id ? buildsById[id] : undefined),
    buildByRepoId: (id?: string): TopLevelIndicator => {
      if (!id) return topLevelIndicator(defaultBuildStats);
      if (!buildStats[id]) return topLevelIndicator(defaultBuildStats);
      return topLevelIndicator(buildStats[id]);
    },
    latestMasterBuildIds: (repoId?: string) => (repoId
      ? Object.values(latestMasterBuildIds[repoId] || {})
      : []).filter(Boolean).map(assertDefined)
  };
};
/* eslint-enable @typescript-eslint/indent */
