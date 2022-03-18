import type { UIWorkItem } from '../../../../shared/types';
import type { WorkItemAccessors } from './helpers';

export const closedWorkItemsCsv = (workItems: UIWorkItem[], accessors: WorkItemAccessors) => [
  [
    'ID',
    'Type',
    'Group',
    'Title',
    'Started on',
    'Completed on',
    'Cycle time (days)',
    'Change lead time (days)',
    'Working time (days)',
    'Waiting time (days)',
    'Priority',
    'URL'
  ],
  ...workItems.map(wi => {
    const { start: s, end: e } = accessors.workItemTimes(wi);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const start = s!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const end = e!;

    return [
      wi.id,
      accessors.workItemType(wi.typeId).name[0],
      wi.groupId ? accessors.workItemGroup(wi.groupId).name : '-',
      wi.title,
      start.split('T')[0],
      end.split('T')[0],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Math.round(accessors.cycleTime(wi)! / (1000 * 60 * 60 * 24)),
      accessors.workItemTimes(wi).devComplete
        ? Math.round((
          new Date(end).getTime()
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          - new Date(accessors.workItemTimes(wi).devComplete!).getTime()
        ) / (1000 * 60 * 60 * 24))
        : '-',
      Math.round(accessors.workCenterTime(wi) / (1000 * 60 * 60 * 24)),
      Math.round((new Date(end).getTime() - new Date(start).getTime() - accessors.workCenterTime(wi)) / (1000 * 60 * 60 * 24)),
      wi.priority || 'unknown',
      wi.url
    ];
  })
];