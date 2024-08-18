import React from 'react';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Plugin marketplace filters
 *
 * @remarks
 *
 * This component is used to display the plugin marketplace filters on the portal.
 * It displays a list of categories to filter the plugins.
 *
 * It is used by the PluginMarketplaceSection component.
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
        <span className='text-lg'>{dict.marketplace.categories}</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {categories.map((category, idx) => (
            <Button
              key={`select-plugin-marketplace-category-filter-${idx}`}
              onClick={() => onSelectCategory(category)}
              ariaLabel={`Toggle ${category} filter`}
              size='sm'
              variant={`outline`}
              className={`min-w-16 text-irmin_black dark:text-white ${selectedCategory === category ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-irmin_black-600'}`}
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
