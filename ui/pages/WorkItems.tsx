import React, {
  useCallback, useMemo, useState
} from 'react';
import { useQueryParam } from 'use-query-params';
import { useParams } from 'react-router-dom';
import type { ProjectWorkItemAnalysis, UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { workItemMetrics, workItemRevisions } from '../network';
import { createPalette, dontFilter } from '../helpers/utils';
import WorkItem from '../components/WorkItemHealth';
import useFetchForProject from '../hooks/use-fetch-for-project';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import AppliedFilters from '../components/AppliedFilters';
import Loading from '../components/Loading';
import InfiniteScrollList from '../components/common/InfiniteScrollList';

const colorForStage = createPalette([
  '#2ab7ca', '#fed766', '#0e9aa7', '#3da4ab',
  '#f6cd61', '#fe8a71', '#96ceb4', '#ffeead',
  '#ff6f69', '#ffcc5c', '#88d8b0', '#a8e6cf',
  '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#00b159', '#00aedb', '#f37735', '#ffc425',
  '#edc951', '#eb6841', '#00a0b0', '#fe4a49'
]);

const bySearchTerm = (searchTerm: string) => (workItem: UIWorkItem) => (
  (`${workItem.id}: ${workItem.title}`).toLowerCase().includes(searchTerm.toLowerCase())
);

const sorters = (childrenCount: (id: number) => number): SortMap<UIWorkItem> => ({
  'Bundle size': (a, b) => childrenCount(a.id) - childrenCount(b.id)
});

const useRevisionsForCollection = () => {
  const { collection } = useParams<{ collection: string }>();
  const [revisions, setRevisions] = useState<Record<string, 'loading' | UIWorkItemRevision[]>>({});

  const getRevisions = useCallback((workItemIds: number[]) => {
    const needToFetch = workItemIds.filter(id => !revisions[id]);

    setRevisions(rs => needToFetch.reduce((rs, id) => ({ ...rs, [id]: 'loading' }), rs));

    if (!needToFetch.length) return;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    workItemRevisions(collection!, [...new Set(needToFetch)]).then(revisions => {
      setRevisions(rs => needToFetch.reduce((rs, id) => ({ ...rs, [id]: revisions[id] }), rs));
    });
  }, [collection, revisions]);

  return [revisions, getRevisions] as const;
};

const WorkItemsInternal: React.FC<{ workItemAnalysis: ProjectWorkItemAnalysis }> = ({ workItemAnalysis }) => {
  const [revisions, getRevisions] = useRevisionsForCollection();
  const [search] = useQueryParam<string>('search');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const workItems = workItemAnalysis.workItems!;

  const sorterMap = useMemo(() => {
    const { workItems } = workItemAnalysis;
    if (workItems === null) return sorters(() => 0);
    return sorters((id: number) => (workItems.ids[id] || []).length);
  }, [workItemAnalysis]);

  const sorter = useSort(sorterMap, 'Bundle size');

  const workItemById = useCallback(
    (id: number) => workItems.byId[id],
    [workItems.byId]
  );

  const filteredWorkItems = useMemo(() => {
    const { workItems } = workItemAnalysis;
    if (!workItems) return [];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const topLevelWorkItems = workItems.ids[0]!.map(workItemById);
    return topLevelWorkItems
      .filter(search === undefined ? dontFilter : bySearchTerm(search))
      .sort(sorter);
  }, [search, sorter, workItemAnalysis, workItemById]);

  const workItemType = useCallback((workItem: UIWorkItem) => (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    workItemAnalysis.workItems!.types[workItem.typeId]
  ), [workItemAnalysis]);

  const setRenderedWorkItems = useCallback((workItems: UIWorkItem[]) => {
    getRevisions(workItems.map(({ id }) => id));
  }, [getRevisions]);

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="workitems" count={filteredWorkItems.length} />
      </div>

      <InfiniteScrollList
        items={filteredWorkItems}
        itemKey={({ id }) => id}
        onRenderItems={setRenderedWorkItems}
        itemRenderer={workItem => (
          <WorkItem
            workItemId={workItem.id}
            workItemsById={workItems.byId}
            workItemsIdTree={workItems.ids}
            workItemType={workItemType}
            colorForStage={colorForStage}
            revisions={revisions}
            getRevisions={getRevisions}
          />
        )}
      />
    </>
  );
};

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);

  if (workItemAnalysis === 'loading') return <Loading />;
  if (!workItemAnalysis.workItems) return <div>No work items found.</div>;

  return <WorkItemsInternal workItemAnalysis={workItemAnalysis} />;
};
export default WorkItems;
