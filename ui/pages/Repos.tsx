import React, { useMemo } from 'react';
import { useQueryParam } from 'use-query-params';
import AlertMessage from '../components/common/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';
import { repoMetrics } from '../network';
import { dontFilter, filterBySearch } from '../helpers/utils';
import type { RepoAnalysis } from '../../shared/types';
import useFetchForProject from '../hooks/use-fetch-for-project';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import Loading from '../components/Loading';
import { aggregateDevs } from '../helpers/aggregate-devs';
import RepoSummary from '../components/RepoSummary';
import InfiniteScrollList from '../components/common/InfiniteScrollList';
import { combinedQualityGateStatus } from '../components/code-quality-utils';

const qualityGateNumber = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 1000;
  const status = combinedQualityGateStatus(codeQuality);
  if (status === 'pass') return 3;
  if (status === 'warn') return 2;
  return 1;
};

const bySearch = (search: string) => (repo: RepoAnalysis) => filterBySearch(search, repo.name);
const byCommitsGreaterThanZero = (repo: RepoAnalysis) => repo.commits.count;
const byBuildsGreaterThanZero = (repo: RepoAnalysis) => (repo.builds?.count || 0) > 0;
const byFailingLastBuilds = (repo: RepoAnalysis) => (
  repo.builds?.pipelines.some(pipeline => pipeline.status.type !== 'succeeded')
);
const byTechDebtMoreThanDays = (techDebtMoreThanDays: number) => (repo: RepoAnalysis) => (
  repo.codeQuality?.some(
    q => (q.maintainability.techDebt || 0) / (24 * 60) > techDebtMoreThanDays
  )
);

const sorters: SortMap<RepoAnalysis> = {
  'Builds': (a, b) => (a.builds?.count || 0) - (b.builds?.count || 0),
  'Branches': (a, b) => a.branches.total.count - b.branches.total.count,
  'Commits': (a, b) => a.commits.count - b.commits.count,
  'Pull requests': (a, b) => a.prs.total - b.prs.total,
  'Tests': (a, b) => (a.tests?.total || 0) - (b.tests?.total || 0),
  'Code quality': (a, b) => qualityGateNumber(b.codeQuality) - qualityGateNumber(a.codeQuality)
};

const Repos: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Builds');
  const [search] = useQueryParam<string>('search');
  const [commitsGreaterThanZero] = useQueryParam<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useQueryParam<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useQueryParam<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useQueryParam<number>('techDebtGreaterThan');

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  const repos = useMemo(() => {
    if (projectAnalysis === 'loading') return [];

    return projectAnalysis.repos
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
      .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
      .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
      .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
      .sort(sorter);
  }, [buildsGreaterThanZero, commitsGreaterThanZero, projectAnalysis, search, sorter, techDebtMoreThanDays, withFailingLastBuilds]);

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return <Loading />;

  return repos.length ? (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="repos" count={repos.length} />
        <RepoSummary repos={repos} />
      </div>
      <InfiniteScrollList
        items={repos}
        itemKey={repo => repo.id}
        itemRenderer={(repo, index) => (
          <RepoHealth
            repo={repo}
            aggregatedDevs={aggregatedDevs}
            isFirst={index === 0}
          />
        )}
      />
    </>
  ) : <AlertMessage message="No repos found" />;
};

export default Repos;

