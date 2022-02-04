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
        order="desc"
        notice="Total number of branches in the repository"
      />
    )
  }, {
    label: 'Active',
    count: num(branchStats.active.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.active}
        order="desc"
        notice="Branches that have got commits in the last 15 days"
      />
    )
  }, {
    label: 'Abandoned',
    count: num(branchStats.abandoned.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.abandoned}
        order="asc"
        notice="Branches that  have commits that are not in the default branch, but haven't got any commits in the last 15 days"
      />
    )
  }, {
    label: 'Delete candidates',
    count: num(branchStats.deleteCandidates.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.deleteCandidates}
        order="asc"
        notice="Inactive branches which are in-sync with the default branch"
      />
    )
  }, {
    label: 'Possibly conflicting',
    count: num(branchStats.possiblyConflicting.count),
    component: () => (
      <GenericBranchStats
        branchStats={branchStats.possiblyConflicting}
        order="desc"
        notice="Branches that are significantly out of sync with the default branch"
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
    <TabContents gridCols={1}>
      {
        branchStats.total.count
          ? (
            <>
              <div className="grid-cols-1">
                {
                  tabs.map((tab, index) => (
                    <BranchTab
                      key={tab.label}
                      isSelected={index === selectedTab}
                      onToggleSelect={() => {
                        setSelectedTab(index);
                      }}
                      count={tab.count}
                      label={tab.label}
                    />
                  ))
                }
              </div>
              { tabs[selectedTab].component() }
            </>
          )
          : <AlertMessage message="No branches in this repo" />
      }
    </TabContents>
  );
};

export default (branches: RepoAnalysis['branches']): Tab => ({
  title: 'Branches',
  count: branches.total.count,
  content: () => (<BranchStats branchStats={branches} />)
});
