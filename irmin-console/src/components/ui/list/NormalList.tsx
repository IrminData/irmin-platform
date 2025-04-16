'use client';

import React, { useMemo, useState } from 'react';

import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { ListProps } from '@/types/internal/ListProps';

/**
 * Normal list UI component
 *
 * @remarks
 *
 * This component uses an HTML table to display a list of items with headers, actions and expandable details.
 * If `noActions` is false, an extra column is shown for actions. Otherwise, the last header is right-aligned.
 *
 * @param props - The component props
 * @param props.rows - The list of rows to display
 * @param props.headers - The list of headers to display
 * @param props.hideHeaders - Whether to hide the headers
 * @param props.loading - Whether the list is in a loading state
 * @param props.noActions - Whether to hide the actions column
 * @returns The JSX element
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

  // Number of columns = number of headers, plus 1 if we have actions
  const totalColumns = useMemo(
    () => (noActions ? headers.length : headers.length + 1),
    [noActions, headers]
  );

  return (
    <div className='scrollbar-hide h-full w-full overflow-auto' id='list'>
      <table className='bg-background bg-popover/10 w-full max-w-3xl max-w-full border-collapse rounded-lg border p-2 text-sm shadow-xs transition-all dark:border-gray-800'>
        {/* Table head */}
        {!hideHeaders && (
          <thead>
            <tr className='border-b border-gray-200 bg-gray-100 dark:border-gray-800'>
              {headers.map((header, index) => {
                // If we have NO actions, the last header cell is aligned right
                // If we do have actions, all these headers are left-aligned
                const isLastHeader = index === headers.length - 1;
                const textAlignment =
                  !noActions && isLastHeader ? 'text-right' : 'text-left';

                return (
                  <th
                    key={`list-header-${index}`}
                    className={`dark:bg-irmin_black-700 p-2 align-middle text-xs font-normal ${textAlignment}`}
                  >
                    <span className='opacity-60'>{header}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
        )}

        <tbody>
          {/* Loading skeleton rows */}
          {loading
            ? [...Array(8)].map((_, index) => (
                <tr
                  key={`normal-list-loading-skeleton-row-${index}`}
                  className='border-b border-gray-200 dark:border-gray-800'
                >
                  <td colSpan={totalColumns} className='p-2'>
                    <LoadingSkeleton
                      key={`normal-list-loading-skeleton-${index}`}
                      className='my-2 h-14 w-full'
                    />
                  </td>
                </tr>
              ))
            : // Render data rows
              rows.map((row, rowIndex) => {
                // Sort actions if needed
                let sortedActions: typeof row.actions = [];
                if (row.actions && row.actions.length > 0 && !noActions) {
                  sortedActions = row.actions.slice().sort((a, b) => {
                    if (a.primary && !b.primary) return 1;
                    if (!a.primary && b.primary) return -1;
                    return 0;
                  });
                }

                return (
                  <React.Fragment key={`list-row-${rowIndex}`}>
                    {/* Main row */}
                    <tr className='border-b border-gray-200 dark:border-gray-800'>
                      {row.columns.map((column, colIndex) => (
                        <td
                          key={`list-row-${rowIndex}-column-${colIndex}`}
                          className='p-2 align-middle'
                        >
                          {column}
                        </td>
                      ))}

                      {!noActions && (
                        <td className='p-2 text-right align-middle'>
                          {/* If there are actions, display them; otherwise empty cell to keep alignment */}
                          {row.actions && row.actions.length > 0 && (
                            <div className='flex items-center justify-end space-x-2'>
                              {sortedActions.map((action, actionIndex) => (
                                <Button
                                  size='default'
                                  key={`list-row-${rowIndex}-actions-${actionIndex}`}
                                  variant={action.primary ? 'gray' : 'link'}
                                  aria-label={action.label}
                                  href={action.href}
                                  onClick={action.onClick}
                                  className={`w-max ${action.primary ? 'min-w-24' : ''}`}
                                >
                                  {action.label}
                                </Button>
                              ))}

                              {/* If details exist, add toggle button */}
                              {row.details && (
                                <Button
                                  size='lg'
                                  variant='link'
                                  className='mt-1 ml-2 px-0'
                                  onClick={() => {
                                    if (openDetails.includes(rowIndex)) {
                                      setOpenDetails(
                                        openDetails.filter(
                                          (id) => id !== rowIndex
                                        )
                                      );
                                    } else {
                                      setOpenDetails([
                                        ...openDetails,
                                        rowIndex,
                                      ]);
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
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Details row (shown if toggled) */}
                    {row.details && openDetails.includes(rowIndex) && (
                      <tr key={`list-row-${rowIndex}-details`}>
                        <td
                          colSpan={totalColumns}
                          className='px-2 py-2 shadow-inner'
                        >
                          {row.details}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

          {/* No items found row */}
          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan={totalColumns}
                className='p-4 py-8 text-center align-middle'
              >
                <span className='text-foreground text-sm lg:text-base'>
                  {dict.list.noItemsFound}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(NormalList);
