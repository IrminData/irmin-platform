'use client';

import { Fragment, memo, useCallback, useState } from 'react';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import type { GridRow, ListProps } from '@/types/internal/ListProps';

const LoadingRow = ({ totalColumns }: { totalColumns: number }) => {
  return (
    <tr
      className={`
        border-b border-gray-200
        dark:border-gray-800
      `}
    >
      <td colSpan={totalColumns} className='p-2'>
        <LoadingSkeleton className='my-2 h-14 w-full' />
      </td>
    </tr>
  );
};

const ListLoadingSkeleton = ({ totalColumns }: { totalColumns: number }) => {
  return (
    <>
      <LoadingRow totalColumns={totalColumns} />
      <LoadingRow totalColumns={totalColumns} />
      <LoadingRow totalColumns={totalColumns} />
      <LoadingRow totalColumns={totalColumns} />
      <LoadingRow totalColumns={totalColumns} />
      <LoadingRow totalColumns={totalColumns} />
    </>
  );
};

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
 * @param props.emptyStateTitle - The title of the empty state when there are no rows
 * @param props.emptyStateDescription - The description of the empty state when there are no rows
 * @param props.emptyStateAction - The action to show in the empty state when there are no rows
 * @returns The JSX element
 */
const NormalList = ({
  rows,
  headers,
  hideHeaders = false,
  loading = false,
  noActions = false,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
}: ListProps) => {
  const { dict } = useLocale();
  const [openDetails, setOpenDetails] = useState<number[]>([]);

  // Number of columns = number of headers, plus 1 if we have actions
  const totalColumns = noActions ? headers.length : headers.length + 1;

  // Generate stable keys for rows based on content hash
  const generateRowKey = useCallback((row: GridRow, index: number) => {
    // Try to create a more stable key from row content
    const firstColumnText = row.columns[0]?.props?.children?.toString?.() || '';
    const contentHash =
      firstColumnText.slice(0, 10).replace(/\s/g, '') || `row-${index}`;
    return `list-row-${contentHash}-${index}`;
  }, []);

  // Unique keys for each repetitive element
  const headerKeys = headers.map(
    (header, index) => `list-header-${header.replace(/\s/g, '')}-${index}`
  );
  const rowKeys = rows.map((row, index) => generateRowKey(row, index));
  const rowColumnKeys = rows.map((row, index) => {
    const rowKey = generateRowKey(row, index);
    return row.columns.map((_, colIndex) => `${rowKey}-column-${colIndex}`);
  });
  const rowActionKeys = rows.map((row, index) => {
    const rowKey = generateRowKey(row, index);
    return (
      row.actions?.map(
        (action, actionIndex) =>
          `${rowKey}-action-${action.label.replace(/\s/g, '')}-${actionIndex}`
      ) ?? []
    );
  });
  const detailsKeys = rows
    .map((row, index) => {
      const rowKey = generateRowKey(row, index);
      return row.details ? `${rowKey}-details` : null;
    })
    .filter((key) => key !== null);

  return (
    <div className='scrollbar-hide size-full overflow-auto' id='list'>
      <table
        className={`
          w-full max-w-full border-collapse rounded-lg bg-popover/10 p-2 text-sm
          shadow-xs transition-shadow
        `}
      >
        {/* Table head */}
        {!hideHeaders && (
          <thead>
            <tr
              className={`
                border-b border-gray-200 bg-gray-100
                dark:border-gray-800
              `}
            >
              {headers.map((header, index) => {
                // If we have NO actions, the last header cell is aligned right
                // If we do have actions, all these headers are left-aligned
                const isLastHeader = index === headers.length - 1;
                const textAlignment =
                  !noActions && isLastHeader ? 'text-right' : 'text-left';

                return (
                  <th
                    key={headerKeys[index]}
                    className={`
                      p-2 align-middle text-xs font-normal
                      dark:bg-irmin-black-700
                      ${textAlignment}
                    `}
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
          {loading ? (
            <ListLoadingSkeleton totalColumns={totalColumns} />
          ) : (
            // Render data rows
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
                <Fragment key={rowKeys[rowIndex]}>
                  {/* Main row */}
                  <tr
                    className={`
                      border-b border-gray-200
                      dark:border-gray-800
                    `}
                  >
                    {row.columns.map((column, colIndex) => (
                      <td
                        key={rowColumnKeys[rowIndex][colIndex]}
                        className='p-2 align-middle'
                      >
                        {column}
                      </td>
                    ))}

                    {!noActions && (
                      <td className='p-2 text-right align-middle'>
                        {/* If there are actions, display them; otherwise empty cell to keep alignment */}
                        {row.actions && row.actions.length > 0 && (
                          <div
                            className={`flex items-center justify-end space-x-2`}
                          >
                            {sortedActions.map((action, actionIndex) => (
                              <Button
                                size='default'
                                key={rowActionKeys[rowIndex][actionIndex]}
                                variant={action.primary ? 'gray' : 'link'}
                                aria-label={action.label}
                                href={action.href}
                                onClick={action.onClick}
                                className={`
                                  w-max
                                  ${action.primary ? 'min-w-24' : ''}
                                `}
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
                                  <TbChevronUp className='size-5' />
                                ) : (
                                  <TbChevronDown className='size-5' />
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
                    <tr key={detailsKeys[rowIndex]}>
                      <td colSpan={totalColumns} className='p-2 shadow-inner'>
                        {row.details}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}

          {/* No items found row */}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={totalColumns} className='p-0 align-middle'>
                <EmptyState
                  title={emptyStateTitle ?? dict.list.emptyState.generic.title}
                  description={
                    emptyStateDescription ??
                    dict.list.emptyState.generic.description
                  }
                  size='sm'
                  className='py-12'
                  action={emptyStateAction}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default memo(NormalList);
