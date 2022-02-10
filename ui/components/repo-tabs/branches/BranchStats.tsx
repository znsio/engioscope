import React from 'react';
import type { UIBranchStats } from '../../../../shared/types';
import { mediumDate, num } from '../../../helpers/utils';

const BranchStats: React.FC<{
  branchStats: UIBranchStats;
}> = ({
  branchStats: {
    branches,
    count,
    limit
  }
}) => (
  count ? (
    <>
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left"> </th>
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
              <td className="px-6 py-4 whitespace-nowrap text-right">{mediumDate(new Date(branch.lastCommitDate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {
        count > limit ? (
          <p className="text-left text-sm italic text-gray-500 mt-4">
            {`* ${num(count - limit)} branches not shown`}
          </p>
        ) : null
      }
    </>
  ) : <p className="text-gray-600 italic mt-4">No results found.</p>);

export default BranchStats;
