import {
  last, length, pipe, prop
} from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import type { LineGraphProps } from '../graphs/LineGraph';
import LineGraph from '../graphs/LineGraph';
import { CrosshairBubble } from './helpers/CrosshairBubble';
import type { WorkItemLine, WorkItemPoint } from './helpers/day-wise-line-graph-helpers';
import { getMatchingAtIndex, splitByDateForLineGraph } from './helpers/day-wise-line-graph-helpers';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  stringifyDateField,
  noGroup,
  useSidebarCheckboxState,
  lineColor, getSidebarStatByKey, getSidebarHeadlineStats
} from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, WorkItemsNested, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';

const isWIPToday = (workItem: UIWorkItem, dayStart: Date, accessors: WorkItemAccessors) => {
  const times = accessors.workItemTimes(workItem);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const start = times.start ? new Date(times.start) : undefined;
  const end = times.end ? new Date(times.end) : undefined;

  if (!start) return false; // Not yet started
  if (start > dayEnd) return false; // Started after today

  // Started today or before today
  if (!end) return true; // Started today or before, but hasn't finished at all
  return end > dayEnd; // Started today or before, not finished today
};

type WIPTrendGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const WIPTrendGraph: React.FC<WIPTrendGraphProps> = ({
  workItems, accessors, openModal
}) => {
  const { organizeByWorkItemType, workItemType } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const hasData = useMemo(
    () => splitByDateForLineGraph(accessors, organizeByWorkItemType(workItems, () => true), isWIPToday)
      .reduce((acc, line) => acc + length(line.workItemPoints.flatMap(p => p.workItems)), 0) > 0,
    [accessors, organizeByWorkItemType, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(workItems, filter),
    [organizeByWorkItemType, workItems, filter]
  );

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const dataByDay = useMemo(
    () => splitByDateForLineGraph(accessors, workItemsToDisplay, isWIPToday),
    [accessors, workItemsToDisplay]
  );

  const [onCheckboxClick, isChecked] = useSidebarCheckboxState(workItemsToDisplay);

  const lineGraphProps = useMemo<LineGraphProps<WorkItemLine, WorkItemPoint>>(() => ({
    className: 'max-w-full',
    lines: dataByDay.filter(x => isChecked(x.witId + x.groupName)),
    points: prop('workItemPoints'),
    pointToValue: pipe(prop('workItems'), length),
    yAxisLabel: num,
    lineLabel: accessors.groupLabel,
    xAxisLabel: pipe(prop('date'), shortDate),
    lineColor,
    crosshairBubble: (pointIndex: number) => (
      <CrosshairBubble
        data={dataByDay.filter(x => isChecked(x.witId + x.groupName))}
        index={pointIndex}
        title="Work in progress"
        itemStat={pipe(length, num)}
        accessors={accessors}
      />
    ),
    onClick: pointIndex => {
      const matchingDate = getMatchingAtIndex(dataByDay, pointIndex);

      return openModal({
        heading: 'Work in progress items',
        subheading: matchingDate.length ? shortDate(matchingDate[0].date) : '',
        body: (
          <WorkItemsNested
            workItems={matchingDate
              .filter(x => x.workItems.length > 0)
              .map(({ groupName, witId, workItems }) => ({
                heading: {
                  label: accessors.groupLabel({ witId, groupName }),
                  flair: num(workItems.length),
                  flairColor: lineColor({ groupName, witId })
                },
                workItems
              }))}
            accessors={accessors}
            tooltip={workItemTooltip}
          />
        )
      });
    }
  }), [accessors, dataByDay, isChecked, openModal, workItemTooltip]);

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = dataByDay.map(({ groupName, witId, workItemPoints }) => ({
      label: groupName === noGroup ? workItemType(witId).name[1] : groupName,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: num(last(workItemPoints)!.workItems.length),
      iconUrl: workItemType(witId).icon,
      color: lineColor({ groupName, witId }),
      isChecked: isChecked(witId + groupName),
      key: witId + groupName
    }));

    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay, workItemType, (_, witId) => (
        num(
          dataByDay
            .filter(item => item.witId === witId)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .map(item => last(item.workItemPoints)!.workItems)
            .flat()
            .length
        )
      ), 'today'
    );

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName] = getSidebarStatByKey(key, workItemsToDisplay);
        const workItemsForLastDay = last(
          dataByDay
            .find(item => item.groupName === groupName && item.witId === witId)
            ?.workItemPoints || []
        )?.workItems || [];

        return openModal({
          heading: 'WIP items over the last 30 days',
          subheading: workItemSubheading(witId, groupName, workItemsForLastDay, workItemType),
          body: (
            <WorkItemFlatList
              workItemType={workItemType(witId)}
              workItems={workItemsForLastDay}
              tooltip={workItemTooltip}
            />
          )
        });
      },
      onCheckboxClick
    };
  }, [accessors, dataByDay, isChecked, onCheckboxClick, openModal, workItemTooltip, workItemsToDisplay]);

  return (
    <GraphCard
      title="Work in progress trend"
      subtitle="Trend of work items in progress per day over the last 30 days"
      hasData={hasData}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={workItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={workItems} setFilter={setPriorityFilter} />
          </div>
          <LineGraph<WorkItemLine, WorkItemPoint> {...lineGraphProps} />
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li key={witId}>
                {`A ${workItemType(witId).name[0].toLowerCase()} is considered to be WIP if it has a `}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {`${stringifyDateField(workItemType(witId).startDateFields!).replace(', whichever is earlier', '')}, but doesn't have a `}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {`${stringifyDateField(workItemType(witId).endDateFields!).replace(', whichever is earlier', '')}.`}
              </li>
            ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default WIPTrendGraph;
