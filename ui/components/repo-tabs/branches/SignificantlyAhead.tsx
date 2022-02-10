import React from 'react';
import type { UIBranches } from '../../../../shared/types';
import { mediumDate, num } from '../../../helpers/utils';

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
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left"> </th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Ahead by</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">
            Last commit
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
    {
      count > limit
        ? (
          <p className="flex-1 text-left text-sm italic text-gray-500 mt-4">
            {`* ${num(count - limit)} branches not shown`}
          </p>
        )
        : null
    }
    {
      // TODO: Need better UI treatment of improper default branch config.
      /* <p className="flex-1 text-left text-sm italic text-gray-500 mt-4">
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
      </p> */
    }
  </>
) : <p className="text-gray-600 italic mt-4">No results found.</p>);

export default SignificantlyAheadTabContent;
