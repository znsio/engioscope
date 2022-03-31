import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import usePopover from '../hooks/use-popover';

type Stat = {
  title: string;
  value: ReactNode;
  tooltip?: string;
};

export type ProjectStatProps = {
  topStats: Stat[];
  childStats?: Stat[];
  popupContents?: (x: { topStats: Stat[]; childStats?: Stat[] }) => ReactNode;
  popupDirection?: 'left' | 'right';
};

const ProjectStat: React.FC<ProjectStatProps> = ({
  topStats, childStats, popupContents, popupDirection
}) => {
  const [ref, isOpen, setIsOpen] = usePopover();

  const onButtonClick = useCallback(
    () => {
      if (!popupContents) return;
      setIsOpen(!isOpen);
    },
    [popupContents, isOpen, setIsOpen]
  );

  return (
    <>
      <button
        className={`p-2 border border-gray-200 bg-white shadow-sm ml-1 rounded flex text-left
          ${isOpen ? 'border-gray-300 transform -translate-y-1' : ''}
          ${popupContents ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={onButtonClick}
        ref={ref}
      >
        {topStats ? topStats.map(({ title, value, tooltip }) => (
          <div
            key={`${title}-${value}`}
            data-tip={tooltip}
            data-html
            className={`mx-2 flex flex-col justify-end ${childStats ? 'mr-4' : ''}`}
          >
            <h3 className="text-xs font-medium">{title}</h3>
            <div className="font-bold text-2xl">
              {value}
            </div>
          </div>
        )) : null}

        {childStats ? childStats.map(({ title, value, tooltip }) => (
          <div
            data-tip={tooltip}
            data-html
            key={`${title}-${value}`}
            className="mx-2 flex flex-col h-full justify-end"
          >
            <h3 className="text-xs">{title}</h3>
            <div className="font-bold leading-7">
              {value}
            </div>
          </div>
        )) : null}
      </button>
      {popupContents && isOpen && (
        <div
          style={{ top: '70px' }}
          className={`flex absolute ${
            (popupDirection || 'left') === 'left' ? 'left-0' : 'right-0'
          } z-10 bg-white px-5 py-5 rounded-lg mb-3 shadow-sm border border-gray-200`}
        >
          {popupContents({ topStats, childStats })}
        </div>
      )}
    </>
  );
};

export default ProjectStat;
