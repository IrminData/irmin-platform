import React from 'react';

import Button from '@/components/misc/Button';

const DataMarketplaceFilters = ({
  industries,
  selectedIndustry,
  onSelectIndustry,
}: {
  industries: string[];
  selectedIndustry: string;
  onSelectIndustry: (_industry: string) => void;
}) => {
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg font-semibold'>Industries</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {industries.map((industry, idx) => (
            <Button
              key={`select-data-marketplace-industry-filter-${idx}`}
              onClick={() => onSelectIndustry(industry)}
              ariaLabel={`Toggle ${industry} filter`}
              size='sm'
              variant={`${selectedIndustry === industry ? 'solid' : 'outline'}`}
              colorScheme={`${
                selectedIndustry === industry ? 'primary' : 'gray'
              }`}
              className='min-w-16'
            >
              {industry}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataMarketplaceFilters;
