import React, {
  useCallback, useMemo, useState
} from 'react';
import { useQueryParam } from 'use-query-params';
import { not, pipe } from 'rambda';
import { useParams } from 'react-router-dom';
import type { Pipeline as TPipeline, PipelineStage } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics, releaseDefinitions } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch, getSearchTerm } from '../helpers/utils';
import Loading from '../components/Loading';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary';
import type { NormalizedPolicies } from '../../shared/pipeline-utils';
import {
  normalizePolicy,
  pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineHasUnusedStageNamed,
  pipelineMeetsBranchPolicyRequirements
} from '../../shared/pipeline-utils';
import InfiniteScrollList from '../components/common/InfiniteScrollList';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown';

const dontFilter = (x: unknown) => Boolean(x);
const filterPipelinesByRepo = (search: string, pipeline: TPipeline) => (
  Object.values(pipeline.repos).some((r => r.name === getSearchTerm(search)))
);
const bySearch = (search: string) => (pipeline: TPipeline) => (
  search.startsWith('repo:')
    ? filterPipelinesByRepo(search, pipeline)
    : filterBySearch(search, pipeline.name) || Object.values(pipeline.repos).some(r => filterBySearch(search, r.name))
);
const byNonMasterReleases = pipe(pipelineDeploysExclusivelyFromMaster, not);
const byNotStartsWithArtifact = (pipeline: TPipeline) => Object.keys(pipeline.repos).length === 0;
const byNonPolicyConforming = (policyForBranch: (repoId: string, branch: string) => NormalizedPolicies) => pipe(
  pipelineMeetsBranchPolicyRequirements(policyForBranch), not
);
const bySelectedGroups = (groupNames: string, groups: Record<string, string[]>) => (pipeline: TPipeline) => (
  groupNames.split(',').some(groupName => {
    const repos = groups[groupName] || [];
    return Object.values(pipeline.repos).some(repo => repos.includes(repo.name));
  })
);

const useReleaseDefinitions = () => {
  const [releaseDefinitionCache, setReleaseDefinitionCache] = useState<Record<number, PipelineStage[] | 'loading' | undefined>>({});
  const { collection, project } = useParams<{ collection: string; project: string }>();

  const getReleaseDefinitions = useCallback((definitionIds: number[]) => {
    const needToFetch = definitionIds.filter(id => !releaseDefinitionCache[id]);

    if (!needToFetch.length) return;

    setReleaseDefinitionCache(cache => needToFetch.reduce((d, id) => ({ ...d, [id]: 'loading' }), cache));

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    releaseDefinitions(collection!, project!, [...new Set(needToFetch)])
      .then(revisions => {
        setReleaseDefinitionCache(cache => ({ ...cache, ...revisions }));
      })
      .catch(() => {
        setReleaseDefinitionCache(cache => ({
          ...cache,
          ...needToFetch.reduce((d, id) => ({ ...d, [id]: cache[id] === 'loading' ? undefined : cache[id] }), {})
        }));
      });
  }, [collection, project, releaseDefinitionCache]);

  return [releaseDefinitionCache, getReleaseDefinitions] as const;
};

const ReleasePipelines: React.FC = () => {
  const releaseAnalysis = useFetchForProject(pipelineMetrics);
  const [search] = useQueryParam<string>('search');
  const [nonMasterReleases] = useQueryParam<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useQueryParam<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useQueryParam<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useQueryParam<string>('stageNameExistsNotUsed');
  const [nonPolicyConforming] = useQueryParam<boolean>('nonPolicyConforming');
  const [releaseDefinitions, getReleaseDefinitions] = useReleaseDefinitions();
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam<string[] | undefined>('group');
  useRemoveSort();

  const policyForBranch = useCallback((repoId: string, branch: string): NormalizedPolicies => {
    if (releaseAnalysis === 'loading') return normalizePolicy({});
    return normalizePolicy(releaseAnalysis.policies[repoId]?.[branch] || {});
  }, [releaseAnalysis]);

  const pipelines = useMemo(() => {
    if (releaseAnalysis === 'loading') return [];

    return releaseAnalysis.pipelines
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!nonMasterReleases ? dontFilter : byNonMasterReleases)
      .filter(!notStartsWithArtifact ? dontFilter : byNotStartsWithArtifact)
      .filter(stageNameExists === undefined ? dontFilter : pipelineHasStageNamed(stageNameExists))
      .filter(stageNameExistsNotUsed === undefined ? dontFilter : pipelineHasUnusedStageNamed(stageNameExistsNotUsed))
      .filter(nonPolicyConforming === undefined ? dontFilter : byNonPolicyConforming(policyForBranch))
      .filter(
        !selectedGroupLabels || selectedGroupLabels?.length === 0 || !releaseAnalysis.groups?.groups
          ? dontFilter
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          : bySelectedGroups(selectedGroupLabels as unknown as string, releaseAnalysis.groups!.groups)
      );
  }, [
    nonMasterReleases, nonPolicyConforming, notStartsWithArtifact, policyForBranch,
    releaseAnalysis, search, selectedGroupLabels, stageNameExists, stageNameExistsNotUsed
  ]);

  const setRenderedPipelines = useCallback((renderedPipelines: TPipeline[]) => {
    getReleaseDefinitions(renderedPipelines.map(p => p.id));
  }, [getReleaseDefinitions]);

  if (releaseAnalysis === 'loading') return <Loading />;
  if (!releaseAnalysis.pipelines.length) return <AlertMessage message="No release pipelines found" />;

  return (
    <>
      {releaseAnalysis.groups
        ? (
          <div className="mb-6">
            <MultiSelectDropdownWithLabel
              label={releaseAnalysis.groups.label}
              options={
                Object.keys(releaseAnalysis.groups.groups)
                  .map(group => ({ label: group, value: group }))
              }
              value={selectedGroupLabels || []}
              onChange={x => setSelectedGroupLabels(x.length === 0 ? undefined : x)}
            />
          </div>
        )
        : null}
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="release-pipelines" count={pipelines.length} />
        <ReleasePipelineSummary
          pipelines={pipelines}
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
          policyForBranch={policyForBranch}
          ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
        />
      </div>
      <InfiniteScrollList
        items={pipelines}
        itemKey={pipeline => pipeline.id}
        onRenderItems={setRenderedPipelines}
        itemRenderer={pipeline => (
          <Pipeline
            pipeline={pipeline}
            stagesToHighlight={releaseAnalysis.stagesToHighlight}
            policyForBranch={policyForBranch}
            ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
            releaseDefinition={releaseDefinitions[pipeline.id]}
          />
        )}
      />
    </>
  );
};

export default ReleasePipelines;
