import React, { useState } from 'react';
import type { RepoAnalysis } from '../../../../shared/types';
import type { Tab } from '../Tabs';
import { num } from '../../../helpers/utils';
import BranchStats from './BranchStats';
import SignificantlyAheadTabContent from '../branches/SignificantlyAhead';
import BranchTab from '../branches/BranchTab';
import TabContents from '../TabContents';
import AlertMessage from '../../common/AlertMessage';

const Branches: React.FC<{
  branchStats: RepoAnalysis['branches'];
  defaultBranch: RepoAnalysis['defaultBranch'];
}> = ({
  branchStats,
  defaultBranch
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const defaultBranchLabel = `${defaultBranch
    ? `<code class="border-gray-300 border-2 rounded-md px-1 py-0 italic">${defaultBranch}</code>` : 'the default branch'}`;

  const tabs = [{
    label: 'Total',
    count: num(branchStats.total.count),
    tooltip: 'Total number of branches in the repository',
    component: () => (
      <BranchStats
        branchStats={branchStats.total}
      />
    )
  }, {
    label: 'Active',
    count: num(branchStats.active.count),
    tooltip: 'Branches that have got commits in the last 15 days',
    component: () => (
      <BranchStats
        branchStats={branchStats.active}
      />
    )
  }, {
    label: 'Abandoned',
    count: num(branchStats.abandoned.count),
    tooltip: `Branches that  have commits that are not in ${defaultBranchLabel}, but haven't got any commits in the last 15 days`,
    component: () => (
      <BranchStats
        branchStats={branchStats.abandoned}
      />
    )
  }, {
    label: 'Delete candidates',
    count: num(branchStats.deleteCandidates.count),
    tooltip: `Inactive branches which are in-sync with ${defaultBranchLabel}`,
    component: () => (
      <BranchStats
        branchStats={branchStats.deleteCandidates}
      />
    )
  }, {
    label: 'Possibly conflicting',
    count: num(branchStats.possiblyConflicting.count),
    tooltip: `Branches that are significantly out of sync with ${defaultBranchLabel}`,
    component: () => (
      <BranchStats
        branchStats={branchStats.possiblyConflicting}
      />
    )
  }, {
    label: 'Significantly ahead',
    count: num(branchStats.significantlyAhead.count),
    tooltip: `The following ${branchStats.significantlyAhead.count > 1 ? 'branches are' : 'branch is'} 
      significantly ahead of ${defaultBranchLabel}`,
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
                      tooltip={tab.tooltip}
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

export default (branches: RepoAnalysis['branches'], defaultBranch: RepoAnalysis['defaultBranch']): Tab => ({
  title: 'Branches',
  count: branches.total.count,
  content: () => (<Branches branchStats={branches} defaultBranch={defaultBranch} />)
});
