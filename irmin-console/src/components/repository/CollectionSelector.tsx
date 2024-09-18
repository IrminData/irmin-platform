'use client;';

import { CiViewTable } from 'react-icons/ci';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';

/**
 * Component for selecting repository collections
 *
 * @param props0 - The props
 * @param props0.repository - The repository to display data for
 * @param props0.selectedCollection - The currently selected collection
 * @param props0.setSelectedCollection - The function to set the selected collection
 */
const CollectionSelector = ({
  repository,
  selectedCollection,
  setSelectedCollection,
}: {
  repository: Repository;
  selectedCollection: string | null;
  setSelectedCollection: (collection: string | null) => void;
}) => {
  const { dict } = useLocale();
  return (
    <div className='flex flex-col gap-2'>
      {repository.collections.map((item, idx) => (
        <Button
          size='sm'
          colorScheme='gray'
          variant={
            selectedCollection === item.formatted_name ? 'outline' : 'link'
          }
          className='h-auto min-h-6 w-full justify-start rounded px-0 py-0 pl-2 text-xs font-normal shadow-none lg:min-h-6 lg:px-2 dark:text-gray-200'
          key={`${repository.slug}-collection-${idx}`}
          aria-label={`Select collection ${item.formatted_name}`}
          onClick={() =>
            setSelectedCollection(
              selectedCollection === item.formatted_name
                ? null
                : item.formatted_name
            )
          }
          icon={<CiViewTable />}
        >
          {item.formatted_name}
        </Button>
      ))}
      {repository.collections.length === 0 && (
        <p className='py-4 text-xs text-gray-400'>
          {dict.repository.noCollections}
        </p>
      )}
    </div>
  );
};

export default CollectionSelector;
