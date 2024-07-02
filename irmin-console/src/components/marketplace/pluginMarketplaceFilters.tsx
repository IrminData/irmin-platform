import React from 'react';

import Button from '@/components/misc/Button';

const PluginMarketplaceFilters: React.FC<{
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (_category: string) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg font-semibold'>Categories</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {categories.map((category, idx) => (
            <Button
              key={`select-plugin-marketplace-category-filter-${idx}`}
              onClick={() => onSelectCategory(category)}
              ariaLabel={`Toggle ${category} filter`}
              size='sm'
              variant={`${selectedCategory === category ? 'solid' : 'outline'}`}
              colorScheme={`${
                selectedCategory === category ? 'primary' : 'gray'
              }`}
              className='min-w-16'
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PluginMarketplaceFilters;
