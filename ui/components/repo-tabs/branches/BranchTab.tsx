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
      className={`px-4 py-2 text-gray-900 break-words rounded-lg mr-2
        ${isSelected ? 'bg-white' : 'hover:bg-white'}
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
