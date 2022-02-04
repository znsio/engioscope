import React from 'react';
import type { UIBranchStats } from '../../../../shared/types';
import { mediumDate, num } from '../../../helpers/utils';
import { Ascending, Descending } from '../../common/Icons';

const GenericBranchStats: React.FC<{
  notice?: string;
  branchStats: UIBranchStats;
  order: 'asc' | 'desc';
}> = ({
  notice,
  branchStats: {
    branches,
    count,
    limit
  },
  order
}) => (
  count ? (
    <>
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left">Branch</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">
              <span className="inline-block align-middle mr-2">Last commit</span>
              <span className="inline-block align-middle mr-2">{ order === 'asc' ? <Ascending /> : <Descending />}</span>
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
      <div className="flex justify-between">
        { notice ? <p className="flex-1 text-left text-sm italic text-gray-500 mt-4">{notice}</p> : null }
        {
          count > limit ? (
            <p className="flex-1 text-right text-sm italic text-gray-500 mt-4">
              {`* ${num(count - limit)} rows not shown`}
            </p>
          ) : null
        }
      </div>
    </>
  ) : <p className="text-gray-600 italic">No results found.</p>);

export default GenericBranchStats;
