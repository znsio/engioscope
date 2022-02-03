import React, { useState } from 'react';
import type { RepoAnalysis } from '../../../../shared/types';
import type { Tab } from '../Tabs';
import { num } from '../../../helpers/utils';
import GenericBranchStats from '../branches/GenericBranchStats';
import SignificantlyAheadTabContent from '../branches/SignificantlyAhead';
import BranchTab from '../branches/BranchTab';
import TabContents from '../TabContents';
import AlertMessage from '../../common/AlertMessage';

const BranchStats: React.FC<{
  branchStats: RepoAnalysis['branches'];
}> = ({
  branchStats
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [{
    label: 'Total',
    count: num(branchStats.total.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.total}
        notice={(
          <p className="text-gray-600 italic">
            Total number of branches in the repository, sorted by
            {' '}
            <strong>the one most recently committed to first</strong>
          </p>
        )}
      />
    )
  }, {
    label: 'Active',
    count: num(branchStats.active.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.active}
        notice={(
          <p className="text-gray-600 italic">
            Branches that have got commits in the last 15 days, sorted by
            {' '}
            <strong>the one most recently committed to first</strong>
          </p>
        )}
      />
    )
  }, {
    label: 'Abandoned',
    count: num(branchStats.abandoned.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.abandoned}
        notice={(
          <p className="text-gray-600 italic">
            Branches that  have commits that are not in the default branch, but haven't got any commits in the last 15 days, sorted by
            {' '}
            <strong>the oldest one first</strong>
          </p>
        )}
      />
    )
  }, {
    label: 'Delete candidates',
    count: num(branchStats.deleteCandidates.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.deleteCandidates}
        notice={(
          <p className="text-gray-600 italic">
            Inactive branches which are in-sync with the default branch, sorted by
            {' '}
            <strong>the oldest one first</strong>
          </p>
        )}
      />
    )
  }, {
    label: 'Possibly conflicting',
    count: num(branchStats.possiblyConflicting.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.possiblyConflicting}
        notice={(
          <p className="text-gray-600 italic">
            Branches that are significantly out of sync with the default branch, sorted by
            {' '}
            <strong>the one most recently committed to first</strong>
          </p>
        )}
      />
    )
  }, {
    label: 'Significantly ahead',
    count: num(branchStats.significantlyAhead.count),
    component: () => (
      <SignificantlyAheadTabContent
        significantlyAheadBranchStats={branchStats.significantlyAhead}
      />
    )
  }];

  return (
    <>
      {
        branchStats.total.count
          ? tabs.map((tab, index) => (
            <BranchTab
              key={tab.label}
              isSelected={index === selectedTab}
              onToggleSelect={() => {
                setSelectedTab(index);
              }}
              count={tab.count}
              label={tab.label}
            />
          )) : null
      }

      <TabContents gridCols={1}>
        {
          branchStats.total.count
            ? tabs[selectedTab].component()
            : <AlertMessage message="No branches in this repo" />
        }
      </TabContents>
    </>
  );
};

export default (branches: RepoAnalysis['branches']): Tab => ({
  title: 'Branches',
  count: branches.total.count,
  content: () => (<BranchStats branchStats={branches} />)
});
