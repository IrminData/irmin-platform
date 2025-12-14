'use client';

import { useEffect, useMemo, useState } from 'react';

import { AiOutlineDownload } from 'react-icons/ai';
import { TbSearch } from 'react-icons/tb';

import AdvancedDatatable from '@/components/repository/objects/ObjectViewer/AdvancedDatatable';
import JSONViewer from '@/components/repository/objects/ObjectViewer/JSONViewer';
import { Button } from '@/components/ui/button';
import DataSizeWarning from '@/components/ui/DataSizeWarning';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { checkIfSimpleArrayOfObjects } from '@/utils/checkIfSimpleArrayOfObjects';
import { canSafelyRenderTable } from '@/utils/dataSizeUtils';
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
  const { dict } = useLocale();

  const [filterText, setFilterText] = useState('');
  const [filteredItems, setFilteredItems] = useState<
    Record<string, TableCellValue>[]
  >([]);

  // Reset forceRender when data changes to re-enable safety checks
  const [forceRenderState, setForceRenderState] = useState({
    data,
    forceRender: false,
  });

  const forceRender =
    forceRenderState.data === data && forceRenderState.forceRender;

  const isSimpleArrayOfObjects = useMemo(
    () => checkIfSimpleArrayOfObjects(data),
    [data]
  );

  const rowCount = useMemo(() => {
    if (!isSimpleArrayOfObjects || !Array.isArray(data)) return 0;
    return data.length;
  }, [isSimpleArrayOfObjects, data]);

  const renderStatus = useMemo(() => {
    if (!isSimpleArrayOfObjects || !Array.isArray(data)) {
      return { safe: true, hardLimit: false };
    }
    return canSafelyRenderTable(data);
  }, [isSimpleArrayOfObjects, data]);

  // Update the filtered items when the filter text changes (for simple array of objects)
  useEffect(() => {
    if (!isSimpleArrayOfObjects) return;

    const timer = setTimeout(() => {
      if (filterText && filterText.length > 0) {
        const newData =
          (data as Record<string, TableCellValue>[]).filter((item) => {
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
        setFilteredItems(data as Record<string, TableCellValue>[]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText, data, isSimpleArrayOfObjects]);

  // Check if table is too large to render
  if (isSimpleArrayOfObjects && !forceRender) {
    // Hard limit - block rendering
    if (renderStatus.hardLimit) {
      return (
        <DataSizeWarning
          dataSize={rowCount}
          type='table'
          severity='error'
          onDownload={() =>
            downloadCSV(data as Record<string, TableCellValue>[], title)
          }
        />
      );
    }

    // Warning threshold - allow user to continue
    if (!renderStatus.safe) {
      return (
        <DataSizeWarning
          dataSize={rowCount}
          type='table'
          severity='warning'
          onDownload={() =>
            downloadCSV(data as Record<string, TableCellValue>[], title)
          }
          onContinue={() => setForceRenderState({ data, forceRender: true })}
        />
      );
    }
  }

  return (
    <>
      {/* Title, metadata, and actions */}
      <div className='flex items-center justify-start px-4 py-1 text-xs'>
        <p
          className={`
            ml-0 hidden text-gray-400
            lg:inline
          `}
        >
          {title}
        </p>
        <p
          className={`
            inline text-[8px] text-irmin-blue-500
            md:ml-auto md:pl-2
            lg:text-xs
            dark:text-irmin-green-500
          `}
        >
          {metadata?.rowsReturned && metadata.timeTaken
            ? `
          ${metadata.rowsReturned} ${dict.query.rowsReturnedIn} ${metadata.timeTaken}ms
        `
            : ``}
        </p>
        <div className='grow' />
        <div className='ml-auto flex flex-row items-center gap-2'>
          {isSimpleArrayOfObjects && data && (
            <Button
              icon={<AiOutlineDownload />}
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
            <div
              className={`
                relative flex h-8 w-48 flex-row items-center rounded-full border
                border-gray-200
                dark:border-gray-800
              `}
            >
              <div
                className={`
                  pointer-events-none absolute inset-y-0 start-0 flex
                  items-center ps-3
                `}
              >
                <TbSearch className='text-gray-500' />
              </div>
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className={`
                  block w-full rounded-full bg-gray-50/50 px-4 py-3 ps-10
                  text-xs text-gray-900
                  placeholder:invisible placeholder:opacity-40
                  group-focus-within:placeholder:visible
                  focus:outline-hidden
                  md:placeholder:visible
                  lg:text-sm
                  dark:bg-irmin-black-500/50 dark:text-white
                `}
                placeholder={dict.query.search}
              />
            </div>
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
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
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
