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
        <span className='text-lg font-semibold'>
          {dict.marketplace.industries}
        </span>
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
