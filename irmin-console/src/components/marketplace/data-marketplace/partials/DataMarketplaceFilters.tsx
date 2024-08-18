import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Data marketplace filters
 *
 * @remarks
 *
 * This component is used to display the data marketplace filters on the portal.
 * It displays a list of industries to filter the repositories.
 *
 * It is used by the DataMarketplaceSection component.
 */
const DataMarketplaceFilters = ({
  industries,
  selectedIndustry,
  onSelectIndustry,
}: {
  industries: string[];
  selectedIndustry: string;
  onSelectIndustry: (_industry: string) => void;
}) => {
  const { dict } = useLocale();
  return (
    <div className='my-8'>
      <div className='mb-4'>
        <span className='text-lg'>{dict.marketplace.industries}</span>
        <div className='mt-2 flex flex-wrap gap-2'>
          {industries.map((industry, idx) => (
            <Button
              key={`select-data-marketplace-industry-filter-${idx}`}
              onClick={() => onSelectIndustry(industry)}
              ariaLabel={`Toggle ${industry} filter`}
              size='sm'
              variant={`outline`}
              className={`min-w-16 text-irmin_black dark:text-white ${selectedIndustry === industry ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-irmin_black-600'}`}
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
