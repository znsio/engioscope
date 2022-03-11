import React, { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProjectDetails } from '../hooks/project-details-hooks';
import usePageName from '../hooks/use-page-name';
import type { Tab } from '../types';

type NavItem = {
  key: Tab;
  name?: string;
};

const NavBar: React.FC = () => {
  const location = useLocation();
  const pageName = usePageName();
  const projectDetails = useProjectDetails();
  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  const newRoute = useCallback(
    (selectedKey: string) => `${pathParts.slice(0, -1).join('/')}/${selectedKey}`,
    [pathParts]
  );

  const navItems = useMemo<NavItem[]>(() => [
    { key: '', name: 'Overview' },
    { key: 'repos', name: pageName('repos', projectDetails?.reposCount || 0) },
    { key: 'release-pipelines', name: pageName('release-pipelines', projectDetails?.releasePipelineCount || 0) },
    ...(
      projectDetails?.workItemCount
        ? [{ key: 'workitems', name: pageName('workitems', projectDetails?.workItemCount || 0) } as NavItem]
        : []
    ),
    { key: 'devs', name: pageName('devs', 0) }
  ], [pageName, projectDetails?.releasePipelineCount, projectDetails?.reposCount, projectDetails?.workItemCount]);

  return (
    <div className="grid col-span-2">
      <div className="flex mr-4">
        {navItems.map(({ key, name }) => (
          <Link
            key={key}
            to={newRoute(key)}
            className={`px-3 mr-2 h-10 rounded text-lg
            font-medium leading-4 ${selectedTab === key ? 'bg-gray-800 text-gray-200'
            : 'border-2 border-transparent hover:border-gray-800 text-gray-800 cursor-pointer'}
            focus:outline-none transition duration-300 ease-in-out flex items-center`}
          >
            {name || key}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NavBar;
