import { Config } from '../types';
import { pastDate } from '../utils';
import {
  Build, GitBranchStats, GitPullRequest, GitRepository, Release
} from './azure-types';
import createPaginatedGetter from './create-paginated-getter';
import { FetchResponse } from './fetch-with-disk-cache';

const apiVersion = { 'api-version': '5.1' };

const flattenToValues = <T>(xs: FetchResponse<ListOf<T>>[]) => xs.flatMap(x => x.data.value);
type ListOf<T> = { value: T[], count: number };

const hasAnotherPage = <T>({ headers }: FetchResponse<T>) => (
  Boolean(headers['x-ms-continuationtoken'])
);

const continuationToken = <T>(res: FetchResponse<T> | undefined): Record<string, never> | { continuationToken: string } => {
  if (!res) return {};

  const continuationToken = res.headers['x-ms-continuationtoken'];
  if (!continuationToken) return {};
  return { continuationToken };
};

export default (config: Config) => {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`:${config.token}`).toString('base64')}`
  };
  const paginatedGet = createPaginatedGetter(config);
  const url = (collectionName: string, projectName: string, path: string) => (
    `${config.host}${collectionName}/${projectName}/_apis${path}`
  );
  const list = <T>(
    { url, qsParams, cacheFile }:
    { url:string, qsParams?: Record<string, string>, cacheFile: string }
  ) => (
    paginatedGet<ListOf<T>>({
      url,
      qsParams: prev => ({ ...apiVersion, ...continuationToken(prev), ...qsParams }),
      hasAnotherPage,
      headers: () => authHeader,
      cacheFile: pageIndex => `${cacheFile}_${pageIndex}`
    }).then(flattenToValues)
  );

  return {
    getRepositories: (collectionName: string, projectName: string) => (
      list<GitRepository>({
        url: url(collectionName, projectName, '/git/repositories'),
        cacheFile: `${collectionName}_${projectName}_repositories`
      })
    ),

    getBuilds: (collectionName: string, projectName: string) => (
      list<Build>({
        url: url(collectionName, projectName, '/build/builds'),
        qsParams: { minTime: pastDate(config.lookAtPast).toISOString() },
        cacheFile: `${collectionName}_${projectName}_builds`
      })
    ),

    getPRs: (collectionName: string, projectName: string) => (
      list<GitPullRequest>({
        url: url(collectionName, projectName, '/git/pullrequests'),
        qsParams: { 'searchCriteria.status': 'all' },
        cacheFile: `${collectionName}_${projectName}_prs`
      })
    ),

    getBranchesStats: (collectionName: string, projectName: string, repoId: string) => (
      list<GitBranchStats>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/stats/branches`),
        cacheFile: `${collectionName}_${projectName}_${repoId}_branches`
      })
    ),

    getReleases: async (collectionName: string, projectName: string) => (
      list<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          minCreatedTime: pastDate(config.lookAtPast).toISOString(),
          $expand: 'environments,artifacts'
        },
        cacheFile: `${collectionName}_${projectName}_releases`
      })
    )
  };
};
