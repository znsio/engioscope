import React from 'react';
import type { UIBranches } from '../../../../shared/types';
import { mediumDate, num } from '../../../helpers/utils';
import { Descending } from '../../common/Icons';

const SignificantlyAheadTabContent: React.FC<{
  significantlyAheadBranchStats: UIBranches['significantlyAhead'];
}> = ({
  significantlyAheadBranchStats: {
    count,
    limit,
    branches
  }
}) => (count ? (
  <>
    <table className="table-auto text-center divide-y divide-gray-200 w-full">
      <thead>
        <tr>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left">Branch</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
            <span className="inline-block align-middle mr-2">Ahead by</span>
            <span className="inline-block align-middle mr-2"><Descending /></span>
          </th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">
            <span className="inline-block align-middle mr-2">Last commit</span>
          </th>
        </tr>
      </thead>
      <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
        {branches.map(branch => (
          <tr key={branch.name}>
            <td className="pl-6 py-4 whitespace-nowrap text-left">
              <a href={branch.url} target="_blank" rel="noreferrer" className="link-text">
                {branch.name}
              </a>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {branch.aheadBy}
              {' '}
              commits
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">{mediumDate(new Date(branch.lastCommitDate))}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-between">
      <p className="flex-1 text-left text-sm italic text-gray-500 mt-4">
        The above
        {' '}
        {count > 1 ? 'branches are' : 'branch is'}
        {' '}
        significantly ahead of the default branch.
        {' '}
        {branches.find(b => ['develop', 'development'].includes(b.name)) && (
          <a
            href="https://docs.microsoft.com/en-us/azure/devops/repos/git/change-default-branch?view=azure-devops"
            target="_blank"
            rel="noreferrer"
            className="link-text"
          >
            Is the default branch configured correctly?
          </a>
        )}
      </p>
      {
        count > limit
          ? (
            <p className="flex-1 text-right text-sm italic text-gray-500 mt-4">
              {`* ${num(count - limit)} rows not shown`}
            </p>
          )
          : null
      }
    </div>
  </>
) : <p className="text-gray-600 italic">No results found.</p>);

export default SignificantlyAheadTabContent;
