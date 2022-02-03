import type { ReactNode } from 'react';
import React from 'react';
import type { UIBranchStats } from '../../../../shared/types';
import { mediumDate, num } from '../../../helpers/utils';

const GenericBranchStats: React.FC<{
  notice?: ReactNode;
  branchStats: UIBranchStats;
}> = ({
  notice,
  branchStats: {
    branches,
    count,
    limit
  }
}) => (
  count ? (
    <>
      {notice || null}
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5"> </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">Last commit</th>
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
        count > limit
          ? (
            <p className="w-full text-right text-sm italic text-gray-500 mt-4">
              {`* ${num(count - limit)} more rows not shown`}
            </p>
          )
          : null
      }
    </>
  ) : <p className="text-gray-600 italic">No results found.</p>);

export default GenericBranchStats;
