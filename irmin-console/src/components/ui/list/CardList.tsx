'use client';

import { memo, useState } from 'react';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import type { ListProps } from '@/types/internal/ListProps';

const LoadingCard = () => {
  return (
    <div
      className={`
        flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4
        text-xs
        md:text-sm
        xl:text-base
        dark:border-gray-900 dark:bg-irmin-black-600
      `}
    >
      <LoadingSkeleton className='h-32 w-full' />
    </div>
  );
};

const CardListLoadingSkeleton = () => {
  return (
    <>
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
    </>
  );
};

/**
 * Card List UI component
 *
 * @remarks
 *
 * This component is used to display a list of items in a card format.
 *
 * It can be used to display a list of items with headers and actions.
 *
 * The component is responsive and can be used in any layout.
 *
 * @param props - The component props
 * @param props.rows - The list of rows to display
 * @param props.loading - Whether the list is in a loading state
 * @param props.noActions - Whether to hide the actions column
 * @param props.emptyStateTitle - The title of the empty state when there are no rows
 * @param props.emptyStateDescription - The description of the empty state when there are no rows
 * @param props.emptyStateAction - The action to show in the empty state when there are no rows
 * @returns The JSX element
 */
const CardList = ({
  rows,
  loading = false,
  noActions = false,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
}: ListProps) => {
  const { dict } = useLocale();
  const [openDetails, setOpenDetails] = useState<number[]>([]);

  // Unique keys for each repetitive element
  const cardKeys = rows.map((_, index) => `list-card-${index}`);
  const cardColumnKeys = rows.map((card, index) =>
    card.columns.map((_, colIndex) => `list-card-${index}-column-${colIndex}`)
  );
  const cardActionKeys = rows.map(
    (card, index) =>
      card.actions?.map(
        (_, actionIndex) => `list-card-${index}-action-${actionIndex}`
      ) ?? []
  );

  return (
    <div
      className={`
        scrollbar-hide size-full max-w-3xl overflow-scroll rounded-lg border
        bg-popover/10 p-2
        dark:border-gray-800
      `}
      id='list'
    >
      <div
        className={`
          grid grid-cols-1 items-start gap-2
          sm:grid-cols-2
          lg:grid-cols-3
        `}
      >
        {loading ? (
          <div id='card-list-loading' className='contents'>
            <CardListLoadingSkeleton />
          </div>
        ) : (
          rows.map((card, rowIndex) => (
            <div
              key={cardKeys[rowIndex]}
              id='list-card'
              className={`
                flex flex-col gap-1 rounded-lg border border-gray-200 bg-white
                p-4 text-xs
                md:text-sm
                xl:text-base
                dark:border-gray-900 dark:bg-irmin-black-600
              `}
            >
              <div className='flex flex-wrap items-center justify-between gap-4'>
                {card.columns.map((column, index) => (
                  <div
                    key={cardColumnKeys[rowIndex][index]}
                    className='contents'
                  >
                    {column}
                  </div>
                ))}
              </div>
              {card.actions && card.actions.length > 0 && !noActions && (
                <div
                  className={`mt-4 flex items-center justify-between space-x-2`}
                >
                  <div className='flex flex-wrap justify-start gap-2'>
                    {card.actions
                      .slice()
                      .sort((a, b) =>
                        a.primary && !b.primary
                          ? 1
                          : !a.primary && b.primary
                            ? -1
                            : 0
                      )
                      .map((action, index) => (
                        <Button
                          key={cardActionKeys[rowIndex][index]}
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
                  </div>
                  {card.details && (
                    <div>
                      <Button
                        size='lg'
                        variant='link'
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
                          <TbChevronUp className='size-5' />
                        ) : (
                          <TbChevronDown className='size-5' />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {card.details && openDetails.includes(rowIndex) && (
                <div className='mt-0 rounded-lg'>{card.details}</div>
              )}
            </div>
          ))
        )}
      </div>
      {!loading && rows.length === 0 && (
        <div className='col-span-full'>
          <EmptyState
            title={emptyStateTitle ?? dict.list.emptyState.generic.title}
            description={
              emptyStateDescription ?? dict.list.emptyState.generic.description
            }
            size='sm'
            className='py-8'
            action={emptyStateAction}
          />
        </div>
      )}
    </div>
  );
};

export default memo(CardList);
