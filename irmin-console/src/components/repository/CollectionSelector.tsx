'use client';

import { TbFile, TbFolder, TbTable } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';

/**
 * Component for selecting repository collections styled like GitHub file browser
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

  const getIconByType = (type: string) => {
    switch (type) {
      case 'folder':
        return <TbFolder className='text-blue-500' />;
      case 'file':
        return <TbFile className='text-gray-500' />;
      case 'table':
        return <TbTable className='text-green-500' />;
      case 'stream':
        return <TbFile className='text-purple-500' />;
      default:
        return <TbFile />;
    }
  };

  return (
    <div className='flex w-full flex-col overflow-hidden rounded-md border border-gray-100 bg-white dark:border-gray-800 dark:bg-irmin_black'>
      <div className='bg-gray-100 px-4 py-2 text-sm font-semibold dark:bg-gray-800'>
        {dict.repository.collections}
      </div>
      <div className='p-2'>
        {repository.collections.map((item, idx) => (
          <div
            key={`${repository.slug}-collection-${idx}`}
            className={`flex cursor-pointer flex-wrap items-center justify-between px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 ${
              selectedCollection === item.formatted_name
                ? 'bg-gray-200 dark:bg-gray-700'
                : ''
            }`}
            onClick={() =>
              setSelectedCollection(
                selectedCollection === item.formatted_name
                  ? null
                  : item.formatted_name
              )
            }
          >
            <div className='flex items-center space-x-2'>
              {getIconByType(item.type)}
              <span className='text-sm'>{item.name}</span>
            </div>
            <div className='text-xs text-gray-400'>
              {dict.repository.schema.type}: {item.type}
            </div>
            {item.original_repository !== repository.slug && (
              <div className='w-full text-xs text-gray-400'>
                {dict.repository.collectionFrom}: {item.original_repository}
              </div>
            )}
          </div>
        ))}
        {repository.collections.length === 0 && (
          <p className='py-4 text-center text-xs text-gray-400'>
            {dict.repository.noCollections}
          </p>
        )}
      </div>
    </div>
  );
};

export default CollectionSelector;
