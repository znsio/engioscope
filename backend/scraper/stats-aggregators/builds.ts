import prettyMilliseconds from 'pretty-ms';
import {
  add, adjust, identity, inc, pipe, prop, replace
} from 'rambda';
import yaml from 'yaml';
import type { Build, BuildDefinitionReference } from '../types-azure.js';
import type { UIBuildPipeline, UIBuilds } from '../../../shared/types.js';
import { isMaster, weeks } from '../../utils.js';
import { asc, byDate, desc } from '../../../shared/sort-utils.js';
import type parseBuildReports from '../parse-build-reports.js';

type BuildStats = {
  count: number;
  name: string;
  url: string;
  success: number;
  duration: number[];
  buildsByWeek: number[];
  successesByWeek: number[];
  status:
  | { type: 'unknown' }
  | { type: 'succeeded'; latest: Date }
  | { type: 'failed'; since: Date};
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = {
  count: 0,
  name: 'unknown',
  url: '',
  success: 0,
  duration: [],
  status: { type: 'unknown' },
  buildsByWeek: weeks.map(() => 0),
  successesByWeek: weeks.map(() => 0)
};

const status = (a: BuildStats, b: BuildStats): BuildStats['status'] => {
  if (a.status.type === 'unknown') return b.status;
  if (b.status.type === 'unknown') return a.status;
  if (a.status.type === 'succeeded' && b.status.type === 'succeeded') {
    return a.status.latest < b.status.latest ? b.status : a.status;
  }
  if (a.status.type === 'succeeded' && b.status.type === 'failed') {
    return a.status.latest < b.status.since ? b.status : a.status;
  }
  if (a.status.type === 'failed' && b.status.type === 'succeeded') {
    return a.status.since < b.status.latest ? b.status : a.status;
  }
  if (a.status.type === 'failed' && b.status.type === 'failed') {
    return a.status.since < b.status.since ? a.status : b.status;
  }
  return b.status;
};

const combineStats = (
  incoming: Omit<BuildStats, 'buildsByWeek' | 'successesByWeek'> & { date: Date },
  existing = defaultBuildStats
): BuildStats => {
  const weekIndex = weeks.findIndex(isInWeek => isInWeek(incoming.date));
  return ({
    count: existing.count + incoming.count,
    name: incoming.name,
    url: incoming.url,
    success: existing.success + incoming.success,
    duration: [...existing.duration, ...incoming.duration],
    status: status(incoming as unknown as BuildStats, existing),
    buildsByWeek: adjust(weekIndex, weekIndex === -1 ? identity : inc, existing.buildsByWeek),
    successesByWeek: incoming.success
      ? adjust(weekIndex, weekIndex === -1 ? identity : inc, existing.successesByWeek)
      : existing.successesByWeek
  });
};

const buildDefinitionWebUrl = pipe(
  replace('_apis/build/Definitions/', '_build/definition?definitionId='),
  replace(/\?revision=.*/, '')
);

const templateNameByBuildId = (
  repoNameById: (id: string) => string | undefined,
  buildReports: ReturnType<typeof parseBuildReports>
) => {
  const reportsByRepoId: Record<string, ReturnType<ReturnType<typeof parseBuildReports>>> = {};

  return (repoId: string, buildDefinitionId: string) => {
    const repoName = repoNameById(repoId);
    if (!reportsByRepoId[repoId]) {
      if (repoName) {
        reportsByRepoId[repoId] = buildReports(repoName, 'master');
      } else {
        reportsByRepoId[repoId] = Promise.resolve([]);
      }
    }

    return reportsByRepoId[repoId]
      .then(reports => reports.find(report => report.buildDefinitionId === buildDefinitionId)?.buildScript)
      .then(buildScript => {
        if (!buildScript) return;
        const parsed = yaml.parse(buildScript);
        const possibleTemplate = parsed.template
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          || parsed.stages?.find((s: any) => s.template)?.template as string | undefined;
        if (!possibleTemplate) return;

        const parts = possibleTemplate.split('@');
        if (parts.length > 1) return parts[1];
        return possibleTemplate;
      });
  };
};

export default (
  builds: Build[],
  buildDefinitionsByRepoId: (repoId: string) => BuildDefinitionReference[],
  repoNameById: (id: string) => string | undefined,
  buildReports: ReturnType<typeof parseBuildReports>,
  templateRepoName: string | undefined
) => {
  type AggregatedBuilds = {
    buildStats: Record<string, Record<number, BuildStats>>;
    allMasterBuilds: Record<string, Record<number, Build[] | undefined>>;
  };

  const templateRepo = templateNameByBuildId(repoNameById, buildReports);

  const { buildStats, allMasterBuilds } = [...builds]
    .sort(desc(byDate(prop('finishTime'))))
    .reduce<AggregatedBuilds>((acc, build) => {
      const rId = repoId(build);

      return {
        buildStats: {
          ...acc.buildStats,
          [rId]: {
            ...acc.buildStats[rId],
            [build.definition.id]: combineStats({
              count: 1,
              name: build.definition.name,
              url: buildDefinitionWebUrl(build.definition.url),
              success: build.result !== 'failed' ? 1 : 0,
              duration: [(new Date(build.finishTime)).getTime() - (new Date(build.startTime).getTime())],
              status: build.result !== 'failed'
                ? { type: 'succeeded', latest: build.finishTime }
                : { type: 'failed', since: build.finishTime },
              date: build.finishTime
            }, acc.buildStats[rId]?.[build.definition.id] || undefined)
          }
        },
        allMasterBuilds: {
          ...acc.allMasterBuilds,
          [rId]: {
            ...acc.allMasterBuilds[rId],
            ...(
              isMaster(build.sourceBranch)
                ? { [build.definition.id]: [...(acc.allMasterBuilds[rId]?.[build.definition.id] || []), build] }
                : {}
            )
          }
        }
      };
    }, { buildStats: {}, allMasterBuilds: {} });

  return {
    buildsByRepoId: async (id?: string): Promise<UIBuilds> => {
      if (!id) return null;
      if (!buildStats[id]) return null;

      const pipelines: UIBuildPipeline[] = await Promise.all(Object.entries(buildStats[id])
        .map(async ([definitionId, buildStats]) => ({
          count: buildStats.count,
          name: buildStats.name,
          url: buildStats.url,
          success: buildStats.success,
          definitionId,
          duration: {
            average: prettyMilliseconds(
              buildStats.duration.reduce(add, 0) / buildStats.duration.length
            ),
            min: prettyMilliseconds(Math.min(...buildStats.duration)),
            max: prettyMilliseconds(Math.max(...buildStats.duration))
          },
          status: buildStats.status.type === 'succeeded' || buildStats.status.type === 'unknown'
            ? buildStats.status
            : { type: 'failed', since: buildStats.status.since } as UIBuildPipeline['status'],
          type: buildDefinitionsByRepoId(id)
            .find(bd => bd.id === Number(definitionId))
            ?.process.type === 1 ? 'ui' : 'yml',
          buildsByWeek: buildStats.buildsByWeek,
          successesByWeek: buildStats.successesByWeek,
          // eslint-disable-next-line no-nested-ternary
          usesTemplate: templateRepoName
            ? ((await templateRepo(id, definitionId)) === templateRepoName ? true : undefined)
            : undefined
        })));

      const pipelinesWithUnused = buildDefinitionsByRepoId(id)
        ? pipelines.concat(
          buildDefinitionsByRepoId(id)
            .filter(d => !pipelines.some(p => p.definitionId === d.id.toString()))
            .sort(asc(byDate(x => x.latestBuild?.startTime || new Date(0))))
            .map<UIBuildPipeline>(d => ({
              count: 0,
              name: d.name,
              url: buildDefinitionWebUrl(d.url),
              success: 0,
              definitionId: d.id.toString(),
              duration: { average: '0', min: '0', max: '0' },
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              status: { type: 'unused', since: d.latestBuild!.startTime },
              type: d.process.type === 1 ? 'ui' : 'yml',
              usesTemplate: undefined
            }))
        )
        : pipelines;

      return {
        count: pipelinesWithUnused.reduce((acc, p) => acc + p.count, 0),
        pipelines: pipelinesWithUnused
      };
    },
    allMasterBuilds
  };
};
