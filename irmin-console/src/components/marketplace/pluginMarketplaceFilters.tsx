import React from 'react';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Plugin marketplace filters
 *
 * @remarks
 *
 * This component is used to display the plugin marketplace filters on the portal.
 * It displays a list of categories to filter the plugins.
 *
 * It is used by the PluginMarketplace component.
 */
const PluginMarketplaceFilters: React.FC<{
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (_category: string) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  const { dict } = useLocale();
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg font-semibold'>
          {dict.marketplace.categories}
        </span>
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
