import React, {
  useCallback, useEffect, useMemo, useState
} from 'react';
import { Link, useHistory } from 'react-router-dom';
import type { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers/utils';
import Card from './common/ExpandingCard';
import Flair from './common/Flair';
import builds from './repo-tabs/builds';
import branches from './repo-tabs/branches';
import commits from './repo-tabs/commits';
import prs from './repo-tabs/prs';
import tests from './repo-tabs/tests';
import codeQuality from './repo-tabs/codeQuality';
import type { Tab } from './repo-tabs/Tabs';
import { TopLevelTab } from './repo-tabs/Tabs';
import { useSortParams } from '../hooks/sort-hooks';
import usePageName from '../hooks/use-page-name';
import type { Dev } from '../types';

const repoSubtitle = (languages: RepoAnalysis['languages'] = [], defaultBranch?: RepoAnalysis['defaultBranch']) => {
  if (!languages.length && !defaultBranch) return;

  const totalLoc = languages.reduce((acc, lang) => acc + lang.loc, 0);

  return (
    <span className="flex flex-1 justify-between">
      <span>
        {
          [...languages]
            .sort((a, b) => b.loc - a.loc)
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
      {defaultBranch ? <span className="italic text-sm text-gray-500">{`Default branch: ${defaultBranch}`}</span> : null}
    </span>
  );
};

type RepoHealthProps = {
  repo: RepoAnalysis;
  aggregatedDevs: Record<string, Dev>;
  isFirst?: boolean;
};

const RepoHealth: React.FC<RepoHealthProps> = ({ repo, isFirst, aggregatedDevs }) => {
  const pageName = usePageName();
  const tabs = useMemo(() => [
    builds(repo.builds),
    branches(repo.branches),
    commits(repo, aggregatedDevs),
    prs(repo.prs),
    tests(repo.tests),
    codeQuality(repo.codeQuality)
  ], [repo, aggregatedDevs]);

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

  const history = useHistory();
  const pipelinesUrl = () => history.location.pathname.replace('/repos', `/release-pipelines?search=repo:"${repo.name}"`);

  return (
    <Card
      title={repo.name}
      titleUrl={repo.url}
      subtitle={repoSubtitle(repo.languages, repo.defaultBranch)}
      onCardClick={onCardClick}
      isExpanded={selectedTab !== null || isFirst || false}
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
