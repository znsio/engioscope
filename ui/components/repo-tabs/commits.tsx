import React from 'react';
import { add } from 'rambda';
import { Link, useLocation } from 'react-router-dom';
import type { RepoAnalysis } from '../../../shared/types';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import CommitTimeline from '../commits/CommitTimeline';
import { ProfilePic } from '../common/ProfilePic';
import Changes from '../commits/Changes';
import type { Dev } from '../../types';

export default (repo: RepoAnalysis, aggregatedDevs: Record<string, Dev>): Tab => {
  const location = useLocation();
  const { commits } = repo;
  const max = Math.max(...Object.values(commits.byDev).flatMap(d => Object.values(d.byDate)));
  const subtitle = (devName: string) => {
    const excludedRepos = aggregatedDevs[devName].repos.filter(r => r.name !== repo.name);
    const commitCount = excludedRepos.flatMap(r => Object.values(r.byDate)).reduce(add, 0);
    return excludedRepos.length > 0
      ? `${commitCount} commits in ${excludedRepos.length} other ${excludedRepos.length === 1 ? 'repo' : 'repos'}`
      : 'No commits in other repos';
  };

  return {
    title: 'Commits',
    count: commits.count,
    content: () => (
      <TabContents gridCols={1}>
        {commits.count === 0
          ? (
            <AlertMessage message="No commits to this repo in the last month" />
          )
          : (
            <>
              <table className="table-auto text-center divide-y divide-gray-200 w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Commits</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Changes</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                  {commits.byDev.map(commitsByDev => {
                    const developerUrl = location.pathname.replace('/repos', `/devs?search="${commitsByDev.name}"`);

                    return (
                      <tr key={commitsByDev.name}>
                        <td className="px-6 py-4 text-left text-sm">
                          <Link to={developerUrl} className="flex commits-profile">
                            <ProfilePic
                              alt={`Profile pic for ${commitsByDev.name}`}
                              src={commitsByDev.imageUrl}
                              width="44"
                              height="44"
                              className="rounded-full inline-block mr-2"
                            />
                            <div>
                              <span className="dev-name font-bold text-blue-600 capitalize">
                                {commitsByDev.name}
                              </span>
                              <p className="text-gray-500 hover:no-underline">
                                {subtitle(commitsByDev.name)}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {Object.values(commitsByDev.byDate).reduce(add, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Changes changes={commitsByDev.changes} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CommitTimeline
                            timeline={commitsByDev.byDate}
                            max={max}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="w-full text-right text-sm italic text-gray-500 mt-4">
                <span>* Data shown is for the last 30 days, not including merge commits</span>
              </div>
            </>
          )}
      </TabContents>
    )
  };
};
