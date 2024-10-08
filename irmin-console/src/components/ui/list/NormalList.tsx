'use client';

import React, { useState } from 'react';

import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import Button from '@/components/ui/Button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { ListProps } from '@/types/internal/ListProps';

/**
 * Normal List UI component
 *
 * @remarks
 *
 * This component is used to display a list of items in a table format.
 *
 * It can be used to display a list of items with headers and actions.
 *
 * The component is responsive and can be used in any layout.
 */
const NormalList: React.FC<ListProps> = ({
  rows,
  headers,
  hideHeaders = false,
  loading = false,
  noActions = false,
}) => {
  const { dict } = useLocale();
  const [openDetails, setOpenDetails] = useState<number[]>([]);
  const totalColumns = headers.length;
  return (
    <div className='scrollbar-hide h-full w-full overflow-scroll' id='list'>
      <div
        className={`grid grid-cols-${totalColumns} box-border h-full w-full min-w-max items-center overflow-hidden rounded-lg bg-background text-left text-xs font-normal shadow-sm transition-all md:text-sm`}
      >
        {!hideHeaders && (
          <div className='contents'>
            {headers.map((header, index) => (
              <div
                key={`list-header-${index}`}
                className={`col-span-1 border-b border-gray-200 bg-gray-100 p-2 py-4 dark:border-gray-800 dark:bg-irmin_black-700 ${!noActions && index === headers.length - 1 ? 'pr-4 text-right' : ''}`}
              >
                <div className='text-xs opacity-60'>{header}</div>
              </div>
            ))}
          </div>
        )}
        {loading ? (
          <div
            id='normal-list-loading'
            className={`col-span-full flex w-full flex-col gap-1 px-2`}
          >
            {[...Array(8)].map((_, index) => (
              <LoadingSkeleton
                key={`normal-list-loading-skeleton-${index}`}
                className={`my-2 h-14 w-full`}
              />
            ))}
          </div>
        ) : (
          rows.map((row, rowIndex) => {
            const rowRendered: JSX.Element[] = [];
            row.columns.forEach((column, index) => {
              rowRendered.push(
                <div
                  key={`list-row-${rowIndex}-column-${index}`}
                  className='p-2'
                >
                  {column}
                </div>
              );
            });
            if (row.actions && row.actions.length > 0 && !noActions) {
              const sortedActions = row.actions.slice().sort((a, b) => {
                if (a.primary && !b.primary) return 1;
                if (!a.primary && b.primary) return -1;
                return 0;
              });
              rowRendered.push(
                <div
                  key={`list-row-${rowIndex}-actions`}
                  className='col-span-1 p-2 text-right'
                >
                  <div className='flex items-center justify-end space-x-2'>
                    {sortedActions.map((action, index) => (
                      <Button
                        size={'sm'}
                        key={`list-row-${rowIndex}-actions-${index}`}
                        variant={action.primary ? 'gray' : 'link'}
                        aria-label={action.label}
                        href={action.href}
                        onClick={action.onClick}
                        className={`w-max ${action.primary ? 'min-w-24' : ''}`}
                      >
                        {action.label}
                      </Button>
                    ))}
                    {row.details && (
                      <Button
                        size='lg'
                        variant='link'
                        className='ml-2 mt-1 px-0'
                        onClick={() => {
                          if (openDetails.includes(rowIndex)) {
                            setOpenDetails(
                              openDetails.filter((id) => id !== rowIndex)
                            );
                          } else {
                            setOpenDetails([...openDetails, rowIndex]);
                          }
                        }}
                        aria-label={
                          openDetails.includes(rowIndex)
                            ? 'Hide details'
                            : 'Show details'
                        }
                      >
                        {openDetails.includes(rowIndex) ? (
                          <IoChevronUpOutline className='h-5 w-5' />
                        ) : (
                          <IoChevronDownOutline className='h-5 w-5' />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
            if (row.details) {
              rowRendered.push(
                <div
                  key={`list-row-${rowIndex}-details`}
                  className={`col-span-full px-2 py-2 shadow-inner ${openDetails.includes(rowIndex) ? '' : 'hidden'}`}
                >
                  {row.details}
                </div>
              );
            }
            return (
              <div
                key={`list-row-${rowIndex}`}
                id='list-row'
                className={`contents`}
              >
                {rowRendered}
                <div className='col-span-full border-b border-gray-200 dark:border-gray-800'></div>
              </div>
            );
          })
        )}
        {!loading && rows.length === 0 && (
          <div className='col-span-full p-4 py-8 text-center text-sm text-foreground lg:text-base'>
            {dict.list.noItemsFound}
          </div>
        )}
      </div>
    </div>
  );
};

export default NormalList;
