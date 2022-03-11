import { add } from 'rambda';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Dev } from '../types';
import Changes from './commits/Changes';
import CommitTimeline from './commits/CommitTimeline';
import { DownChevron, UpChevron } from './common/Icons';
import { ProfilePic } from './common/ProfilePic';

const Developer: React.FC<{ dev: Dev; isFirst: boolean }> = ({ dev, isFirst }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst);
  const location = useLocation();
  const allCommits = dev.repos.flatMap(r => Object.values(r.byDate));
  const commitsCount = allCommits.reduce(add, 0);

  return (
    <li
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
        rounded-lg shadow relative workitem-body"
      style={{ contain: 'content' }}
    >
      <button
        className="w-full text-left flex justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex gap-3">
          <ProfilePic
            src={dev.imageUrl}
            alt={`${dev.name}'s profile pic`}
            width="48"
            height="48"
            className="rounded-full inline-block"
          />
          <div>
            <h3 className="font-bold text-md">
              {dev.name}
            </h3>
            <div className="text-base font-normal text-gray-600">
              <span className="text-blue-gray text-sm my-2">
                <span className="font-semibold text-base">
                  {commitsCount}
                </span>
                {` ${commitsCount === 1 ? 'commit' : 'commits'} in `}
                <span className="font-semibold text-base">
                  {dev.repos.length}
                </span>
                {` ${dev.repos.length === 1 ? 'repo' : 'repos'}`}
              </span>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <span className="flex text-gray-500">
            <span>Show less</span>
            <UpChevron />
          </span>
        ) : (
          <span className="flex text-gray-500">
            <span className="show-more">Show more</span>
            <DownChevron />
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="bg-gray-100 px-8 py-8 mt-4 rounded-lg">
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
              {dev.repos
                .sort((a, b) => Object.values(b.byDate).reduce(add, 0) - Object.values(a.byDate).reduce(add, 0))
                .map(repo => (
                  <tr key={repo.name}>
                    <td className="px-6 py-4 text-left w-5/12">
                      <Link
                        to={location.pathname.replace('/devs', `/repos?search="${repo.name}"`)}
                        className="link-text"
                      >
                        {repo.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-1/12">{Object.values(repo.byDate).reduce(add, 0)}</td>
                    <td className="whitespace-nowrap"><Changes changes={repo.changes} /></td>
                    <td className="px-6 py-4 whitespace-nowrap w-4/12">
                      <CommitTimeline timeline={repo.byDate} max={Math.max(...allCommits)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="w-full text-right text-sm italic text-gray-500 mt-4">
            * Data shown is for the last 30 days, not including merge commits
          </p>
        </div>
      )}
    </li>
  );
};

export default Developer;
