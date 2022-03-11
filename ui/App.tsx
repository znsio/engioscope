import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import ReactTooltip from 'react-tooltip';
import Project from './pages/Project';
import Collection from './pages/Collection';
import { ProjectDetailsProvider } from './hooks/project-details-hooks';
import { SortContextProvider } from './hooks/sort-hooks';
import RecordAnalytics from './components/RecordAnalytics';
import Analytics from './pages/Analytics';
import Summary from './pages/Summary';

const App: React.FC = () => {
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      if (mutations.every(m => m.addedNodes.length === 0)) return;
      ReactTooltip.rebuild();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, []);

  return (
    <BrowserRouter>
      <ProjectDetailsProvider>
        <SortContextProvider>
          <div className="mb-32 overflow-y-auto transition duration-500 ease-in-out">
            <ReactTooltip />
            <QueryParamProvider ReactRouterRoute={Route}>
              <RecordAnalytics />
              <Routes>
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/summary" element={<Summary />} />
                <Route path="/:collection/:project" element={<Project />} />
                <Route path="/" element={<Collection />} />
              </Routes>
            </QueryParamProvider>
          </div>
        </SortContextProvider>
      </ProjectDetailsProvider>
    </BrowserRouter>
  );
};

export default App;
