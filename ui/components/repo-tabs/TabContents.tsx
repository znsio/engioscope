import React from 'react';

const TabContents: React.FC<{ gridCols: number }> = ({ gridCols, children }) => {
  const colsClassName = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9'
  } as const;

  return (
    <div
      className={
        `${gridCols === 0 ? '' : `grid ${colsClassName[gridCols as keyof typeof colsClassName]}`} p-6 py-6 rounded-lg bg-gray-100`
      }
    >
      {children}
    </div>
  );
};

export default TabContents;
