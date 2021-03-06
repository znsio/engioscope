import React, {
  useCallback, useEffect, useMemo, useState
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { prop } from 'rambda';
import type { RepoAnalysis } from '../../shared/types.js';
import { num } from '../helpers/utils.js';
import Card from './common/ExpandingCard.js';
import Flair from './common/Flair.js';
import builds from './repo-tabs/builds.js';
import commits from './repo-tabs/commits.js';
import prs from './repo-tabs/prs.js';
import tests from './repo-tabs/tests.js';
import codeQuality from './repo-tabs/codeQuality.js';
import type { Tab } from './repo-tabs/Tabs.js';
import { TopLevelTab } from './repo-tabs/Tabs.js';
import { useSortParams } from '../hooks/sort-hooks.js';
import usePageName from '../hooks/use-page-name.js';
import type { Dev } from '../types.js';
import { isInactive } from '../../shared/repo-utils.js';
import { byNum, desc } from '../../shared/sort-utils.js';
import branches from './repo-tabs/branches/index.js';

// eslint-disable-next-line default-param-last
const repoSubtitle = (languages: RepoAnalysis['languages'] = [], defaultBranch?: RepoAnalysis['defaultBranch']) => {
  if (!languages.length && !defaultBranch) return;

  const totalLoc = languages.reduce((acc, lang) => acc + lang.loc, 0);

  return (
    <span className="flex flex-1 justify-between">
      <span>
        {
          [...languages]
            .sort(desc(byNum(prop('loc'))))
            .map(l => (
              <Flair
                key={l.lang}
                flairColor={l.color}
                title={`${num(l.loc)} lines of code`}
                label={`${Math.round((l.loc * 100) / totalLoc)}% ${l.lang}`}
              />
            ))
        }
      </span>
      {
        defaultBranch
          ? (
            <span className="italic text-sm text-gray-400" style={{ lineHeight: 'inherit' }}>
              Default branch
              {' '}
              <code className="border-gray-300 border-2 rounded-md px-1 py-0 bg-gray-50">
                {defaultBranch}
              </code>
            </span>
          ) : null
      }
    </span>
  );
};

type RepoHealthProps = {
  repo: RepoAnalysis;
  aggregatedDevs: Record<string, Dev>;
  isFirst?: boolean;
  queryPeriodDays: number;
};

const RepoHealth: React.FC<RepoHealthProps> = ({
  repo, isFirst, aggregatedDevs, queryPeriodDays
}) => {
  const pageName = usePageName();
  const location = useLocation();

  const tabs = useMemo(() => [
    builds(repo.builds, queryPeriodDays),
    branches(repo.branches, repo.defaultBranch),
    commits(repo, aggregatedDevs, location, queryPeriodDays),
    prs(repo.prs),
    tests(repo, queryPeriodDays),
    codeQuality(repo.codeQuality)
  ], [repo, aggregatedDevs, location, queryPeriodDays]);

  const [{ sortBy }] = useSortParams();
  const [selectedTab, setSelectedTab] = useState<Tab | null>(isFirst ? tabs[0] : null);

  useEffect(() => {
    if (sortBy) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return setSelectedTab(isFirst ? tabs.find(t => t.title === sortBy)! : null);
    }
    return setSelectedTab(isFirst ? tabs[0] : null);
  }, [sortBy, tabs, isFirst]);

  const onCardClick = useCallback(() => {
    setSelectedTab(!selectedTab ? tabs[0] : null);
  }, [selectedTab, tabs]);

  const pipelinesUrl = location.pathname.replace('/repos', `/release-pipelines?search=repo:"${repo.name}"`);

  return (
    <Card
      title={repo.name}
      titleUrl={repo.url}
      subtitle={repoSubtitle(repo.languages, repo.defaultBranch)}
      onCardClick={onCardClick}
      isExpanded={selectedTab !== null || isFirst || false}
      className={isInactive(repo) ? 'opacity-60' : ''}
    >
      {repo.pipelineCount ? (
        <div className="mx-6 flex flex-wrap items-baseline">
          <Link
            to={pipelinesUrl}
            className="link-text"
          >
            {`Used in ${repo.pipelineCount} ${pageName('release-pipelines', repo.pipelineCount).toLowerCase()}`}
          </Link>
        </div>
      ) : null}

      {isInactive(repo) ? (
        <p className="pl-5">
          <span
            className="bg-amber-300 text-xs inline-block py-1 px-2 uppercase rounded-md"
            data-tip={`This repository doesn't count towards stats,<br />
            as it hasn't seen any commits or builds in the last ${queryPeriodDays} days.`}
            data-html
          >
            Inactive
          </span>
        </p>
      ) : null}

      <div className="mt-4 px-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {tabs.map(tab => (
          <TopLevelTab
            key={tab.title}
            count={tab.count}
            label={tab.title}
            isSelected={selectedTab === tab}
            onToggleSelect={() => setSelectedTab(selectedTab === tab ? null : tab)}
          />
        ))}
      </div>
      <span role="region">{selectedTab ? selectedTab.content() : null}</span>
    </Card>
  );
};

export default RepoHealth;
