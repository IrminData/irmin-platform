'use client';

import { useEffect, useState } from 'react';

import { AiOutlineDownload } from 'react-icons/ai';

import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { downloadCSV } from '@/utils/csv';

import { TableCellValue } from '@/types/internal/Datatable';
import { JSONValue } from '@/types/internal/GenericJSON';

import AdvancedDatatable from './AdvancedDatatable';
import JSONViewer from './JSONViewer';

/**
 * Show the content of JSON data in a table if it's an array of simple objects.
 * Otherwise, show the JSON data.
 *
 * @param props - The props to pass to the component
 * @param props.title - The title of the table
 * @param props.data - The data to display
 * @param props.metadata - Additional metadata about the run
 * @param props.loading - Whether to show a loading skeleton
 */
const TableData = ({
  title,
  data,
  metadata,
  loading,
}: {
  title: string;
  data: JSONValue | null;
  metadata: {
    rowsReturned?: number;
    timeTaken?: number;
  };
  loading?: boolean;
}) => {
  const { dict } = useLocale();

  const [filterText, setFilterText] = useState('');
  const [filteredItems, setFilteredItems] = useState<
    Array<Record<string, TableCellValue>>
  >([]);

  const isSimpleArrayOfObjects =
    Array.isArray(data) &&
    data.every((item) => typeof item === 'object' && item !== null);

  // Update the filtered items when the filter text changes (for simple array of objects)
  useEffect(() => {
    if (!isSimpleArrayOfObjects) return;

    const timer = setTimeout(() => {
      if (filterText && filterText.length > 0) {
        const newData =
          (data as Array<Record<string, TableCellValue>>).filter((item) => {
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
        setFilteredItems(data as Array<Record<string, TableCellValue>>);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText, data, isSimpleArrayOfObjects]);

  return (
    <>
      {/* Title, metadata, and actions */}
      <div className='flex items-center justify-start px-4 py-1 text-xs'>
        <p className='ml-0 hidden text-gray-400 lg:inline'>{title}</p>
        <p className='inline text-[8px] text-irmin_blue md:ml-auto md:pl-2 lg:text-xs dark:text-irmin_green'>
          {metadata && metadata.rowsReturned && metadata.timeTaken
            ? `
          ${metadata.rowsReturned} ${dict.query.rowsReturnedIn} ${metadata.timeTaken}ms
        `
            : ``}
        </p>
        <div className='flex-grow'></div>
        <div className='ml-auto flex flex-row items-center gap-2'>
          {isSimpleArrayOfObjects && data && (
            <Button
              icon={<AiOutlineDownload />}
              variant='link'
              size='sm'
              className='hidden lg:inline-flex'
              onClick={() =>
                downloadCSV(
                  data as Array<Record<string, TableCellValue>>,
                  title
                )
              }
            >
              {dict.query.exportTable}
            </Button>
          )}
          {isSimpleArrayOfObjects && (
            <input
              type='text'
              className='h-8 w-48 rounded-md border border-solid border-gray-400 px-2 py-1 text-xs focus:outline-none dark:border-gray-800'
              placeholder={dict.query.search}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          )}
        </div>
      </div>
      {/* Content */}
      <div className='flex h-0 flex-1 flex-col overflow-hidden'>
        {loading ? (
          <LoadingSkeleton className='h-96' />
        ) : isSimpleArrayOfObjects ? (
          filteredItems.length === 0 ? (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.query.noResults}
            </div>
          ) : (
            <AdvancedDatatable items={filteredItems} />
          )
        ) : (
          <JSONViewer data={data} />
        )}
      </div>
    </>
  );
};

export default TableData;
