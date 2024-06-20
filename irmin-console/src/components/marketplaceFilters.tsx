import React from 'react';

const MarketplaceFilters = ({
  industries,
  selectedIndustry,
  onSelectIndustry,
}: {
  industries: string[];
  selectedIndustry: string;
  onSelectIndustry: (industry: string) => void;
}) => {
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg font-semibold'>Industries</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {industries.map((industry) => (
            <button
              key={industry}
              className={`rounded border px-3 py-1 text-sm ${
                selectedIndustry === industry
                  ? 'bg-ash_gray text-white'
                  : 'bg-gray-100'
              }`}
              onClick={() => onSelectIndustry(industry)}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceFilters;
