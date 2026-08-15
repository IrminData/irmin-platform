'use client';

import { useEffect, useMemo, useState } from 'react';

import { TbDownload, TbSearch } from 'react-icons/tb';

import AdvancedDatatable from '@/components/repository/objects/ObjectViewer/AdvancedDatatable/Async';
import JSONViewer from '@/components/repository/objects/ObjectViewer/JSONViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { checkIfSimpleArrayOfObjects } from '@/utils/checkIfSimpleArrayOfObjects';
import { downloadCSV } from '@/utils/downloadUtils';

import type { TableCellValue } from '@/types/internal/Datatable';
import type { JSONValue } from '@/types/internal/GenericJSON';

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
const TableViewer = ({
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
  const { dict, locale } = useLocale();

  const [filterText, setFilterText] = useState('');
  const [debouncedFilterText, setDebouncedFilterText] = useState('');
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale]
  );

  const isSimpleArrayOfObjects = useMemo(
    () => checkIfSimpleArrayOfObjects(data),
    [data]
  );

  const baseItems = useMemo(
    () =>
      isSimpleArrayOfObjects ? (data as Record<string, TableCellValue>[]) : [],
    [data, isSimpleArrayOfObjects]
  );

  // Debounce the filter text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText]);

  const filteredItems = useMemo(() => {
    // If no filter, return base items directly
    if (!debouncedFilterText) return baseItems;

    // Create new array only when filtering happens
    return (
      baseItems.filter((item) => {
        return Object.keys(item).some((key) => {
          const value =
            key in item ? item[key as keyof typeof item] : undefined;
          return (
            value &&
            value
              .toString()
              .toLowerCase()
              .includes(debouncedFilterText.toLowerCase())
          );
        });
      }) ?? []
    );
  }, [baseItems, debouncedFilterText]);

  return (
    <>
      {/* Title, metadata, and actions */}
      <div className='flex items-center justify-start px-4 py-1 text-xs'>
        <p
          className={`
            ml-0 hidden text-muted-foreground
            lg:inline
          `}
        >
          {title}
        </p>
        <p
          className={`
            type-mono-small inline whitespace-nowrap text-accent tabular-nums
            md:ml-auto md:pl-2
          `}
        >
          {metadata?.rowsReturned !== undefined &&
          metadata.timeTaken !== undefined
            ? `${numberFormatter.format(metadata.rowsReturned)} ${dict.query.rowsReturnedIn} ${numberFormatter.format(metadata.timeTaken)}\u00a0ms`
            : ''}
        </p>
        <div className='grow' />
        <div className='ml-auto flex flex-row items-center gap-2'>
          {isSimpleArrayOfObjects && data && (
            <Button
              icon={<TbDownload />}
              variant='link'
              size='sm'
              className={`
                hidden
                lg:inline-flex
              `}
              onClick={() =>
                downloadCSV(data as Record<string, TableCellValue>[], title)
              }
            >
              {dict.query.exportTable}
            </Button>
          )}
          {isSimpleArrayOfObjects && (
            <Input
              type='search'
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              icon={<TbSearch aria-hidden='true' />}
              aria-label={dict.query.search}
              className={`
                h-9 w-48 rounded-[2px] border border-border bg-muted/50 px-3
                focus-within:border-accent focus-within:ring-1
                focus-within:ring-accent
              `}
              placeholder={dict.query.search}
            />
          )}
        </div>
      </div>
      {/* Content */}
      <div
        className={`flex h-0 flex-1 flex-col overflow-hidden overflow-y-scroll`}
      >
        {loading ? (
          <LoadingSkeleton className='h-96' />
        ) : isSimpleArrayOfObjects ? (
          filteredItems.length === 0 ? (
            <div
              className='
                w-full px-4 py-12 text-center text-lg text-muted-foreground
              '
            >
              {dict.common.noResults}
            </div>
          ) : (
            <AdvancedDatatable items={filteredItems} />
          )
        ) : (
          <div className='pl-4'>
            <JSONViewer data={data} />
          </div>
        )}
      </div>
    </>
  );
};

export default TableViewer;
