'use client';

import { useEffect, useState } from 'react';

import { AiOutlineDownload } from 'react-icons/ai';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { downloadCSV } from '@/utils/csv';

import { StreamCollectionData } from '@/types/core/StreamCollection';

import AdvancedDatatable from './datatables/AdvancedDatatable';

/**
 * Show the content of a stream collection, eg. {@link StreamCollectionData}.
 *
 * @param props - The props to pass to the component
 * @param props.title - The title of the stream
 * @param props.data - The data to display
 * @param props.loading - Whether to show a loading skeleton
 */
const StreamData = ({
  title,
  data,
  loading,
}: {
  title: string;
  data: StreamCollectionData | null;
  loading?: boolean;
}) => {
  const { dict } = useLocale();

  const [filterText, setFilterText] = useState('');
  const [filteredItems, setFilteredItems] = useState(data?.entries ?? []);

  // Update the filtered items when the filter text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterText && filterText.length > 0) {
        const newData =
          data?.entries.filter((item) => {
            return Object.keys(item).some((key) => {
              const value =
                key in item ? item[key as keyof typeof item] : undefined;
              return (
                value &&
                value
                  .toString()
                  .toLowerCase()
                  .includes(filterText.toLowerCase())
              );
            });
          }) ?? [];
        setFilteredItems(newData);
      } else {
        setFilteredItems(data?.entries ?? []);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText, data]);

  return (
    <>
      {/* Title, metadata and actions */}
      <div className='flex items-center justify-start px-4 py-1 text-xs'>
        <p className='ml-0 hidden text-gray-400 lg:inline'>{title}</p>
        <p className='inline text-[8px] text-irmin_blue md:ml-auto md:pl-2 lg:text-xs dark:text-irmin_green'>
          {data?.isLive
            ? dict.repository.schema.live
            : dict.repository.schema.historical}
        </p>
        <div className='flex-grow'></div>
        <div className='ml-auto flex flex-row items-center gap-2'>
          {data && (
            <Button
              icon={<AiOutlineDownload />}
              colorScheme='secondary'
              variant='link'
              size='sm'
              className='hidden lg:inline-flex dark:text-white'
              onClick={() => downloadCSV(data.entries ?? [], title)}
            >
              {dict.repository.download.download}
            </Button>
          )}
          <input
            type='text'
            className='h-8 w-48 rounded-md border border-solid border-gray-400 px-2 py-1 text-xs focus:outline-none dark:border-gray-800'
            placeholder={dict.query.search}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>
      {/* Table */}
      <div className='flex h-0 flex-1 flex-col overflow-hidden'>
        {loading ? <LoadingSkeleton className='h-96' /> : <></>}
        {!data || !filteredItems || filteredItems.length === 0 ? (
          <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
            {dict.query.noResults}
          </div>
        ) : (
          <AdvancedDatatable items={!loading ? filteredItems : []} />
        )}
      </div>
    </>
  );
};

export default StreamData;
