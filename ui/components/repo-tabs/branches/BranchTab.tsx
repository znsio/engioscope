import React, { useCallback } from 'react';

const BranchTab: React.FC<{
  isSelected: boolean;
  onToggleSelect: () => void;
  count: string;
  label: string;
}> = ({
  isSelected, onToggleSelect, count, label
}) => {
  const onClick = useCallback(e => {
    e.stopPropagation();
    onToggleSelect();
  }, [onToggleSelect]);

  return (
    <button
      className={`pt-2 pb-4 px-6 mt-2 text-gray-900 break-words rounded-t-lg
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'}
        hover:text-gray-900 focus:text-gray-900 cursor-pointer`}
      onClick={onClick}
    >
      <div className={`text-base font-semibold -mb-1 ${isSelected ? 'text-black' : 'text-gray-600'} `}>
        {count}
      </div>
      <div className="uppercase text-xs tracking-wider text-gray-600 mt-2">{label}</div>
    </button>
  );
};

export default BranchTab;
