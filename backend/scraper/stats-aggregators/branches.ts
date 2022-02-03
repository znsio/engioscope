import type { UIBranches } from '../../../shared/types';
import type { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';

const BRANCH_PAGE_LIMIT = 20;

const pageLimitBranches = (branches: GitBranchStats[]) => branches.slice(0, BRANCH_PAGE_LIMIT);
const sortByCommitDate = (asc: boolean) => (a: GitBranchStats, b: GitBranchStats) => (
  (asc ? 1 : -1) * (a.commit.committer.date.getTime() - b.commit.committer.date.getTime())
);
const sortByCommitDateAsc = sortByCommitDate(true);
const sortByCommitDateDesc = sortByCommitDate(false);

export default (repoUrl: string, defaultBranch?: string) => (branches: GitBranchStats[]): UIBranches => {
  const allBranches = branches.sort(sortByCommitDateDesc);
  const activeBranches = branches
    .filter(b => isWithinFortnight(b.commit.committer.date))
    .sort(sortByCommitDateDesc);
  const inActiveBranches = branches
    .filter(b => !isWithinFortnight(b.commit.committer.date))
    .sort(sortByCommitDateAsc);
  const abandonedBranches = inActiveBranches
    .filter(b => b.aheadCount > 0 && b.behindCount > 0)
    .sort(sortByCommitDateAsc);
  const deleteCandidates = branches
    .filter(b => b.behindCount === 0 && b.name !== (defaultBranch ?? '').replace('refs/heads/', ''))
    .sort(sortByCommitDateAsc);
  const possiblyConflicting = branches
    .filter(b => b.aheadCount > 3 && b.behindCount > 10)
    .sort(sortByCommitDateDesc);
  const significantlyAheadBranches = branches
    .filter(b => b.aheadCount >= 20)
    .sort((a, b) => b.aheadCount - a.aheadCount);

  const mapBranch = (
    branch: GitBranchStats,
    branchUrl = `${repoUrl}/?_a=contents&targetVersion=GB${encodeURIComponent(branch.name)}`
  ) => ({
    name: branch.name,
    url: branchUrl,
    lastCommitDate: branch.commit.committer.date
  });

  return {
    total: {
      count: allBranches.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(allBranches).map(branch => mapBranch(branch))
    },
    active: {
      count: activeBranches.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(activeBranches).map(branch => mapBranch(branch))
    },
    abandoned: {
      count: abandonedBranches.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(abandonedBranches).map(branch => mapBranch(
        branch,
        `${repoUrl}/?_a=history&targetVersion=GB${encodeURIComponent(branch.name)}`
      ))
    },
    deleteCandidates: {
      count: deleteCandidates.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(deleteCandidates).map(branch => mapBranch(branch))
    },
    possiblyConflicting: {
      count: possiblyConflicting.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(possiblyConflicting).map(branch => mapBranch(branch))
    },
    significantlyAhead: {
      count: significantlyAheadBranches.length,
      limit: BRANCH_PAGE_LIMIT,
      branches: pageLimitBranches(significantlyAheadBranches).map(b => ({
        name: b.name,
        // TODO: Handle the default branch being undefined case better.
        url: defaultBranch
          // eslint-disable-next-line max-len
          ? `${repoUrl}/branches?targetVersion=GB${encodeURIComponent(b.name)}&baseVersion=GB${encodeURIComponent(defaultBranch.replace('refs/heads/', ''))}&_a=commits`
          : '',
        aheadBy: b.aheadCount,
        lastCommitDate: b.commit.committer.date
      }))
    }
  };
};

