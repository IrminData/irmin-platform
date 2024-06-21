import React from 'react';

const PluginMarketplaceFilters: React.FC<{
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg font-semibold'>Categories</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {categories.map((category) => (
            <button
              key={category}
              className={`rounded border px-3 py-1 text-sm ${
                selectedCategory === category
                  ? 'bg-ash_gray text-white'
                  : 'bg-gray-100'
              }`}
              onClick={() => onSelectCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PluginMarketplaceFilters;
