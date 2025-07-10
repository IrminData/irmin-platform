'use client';

import React, { useState } from 'react';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import Button from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { ListProps } from '@/types/internal/ListProps';

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
 */
const CardList = ({ rows, loading = false, noActions = false }: ListProps) => {
  const { dict } = useLocale();
  const [openDetails, setOpenDetails] = useState<number[]>([]);

  return (
    <div
      className='scrollbar-hide bg-popover/10 h-full w-full max-w-3xl max-w-full overflow-scroll rounded-lg border p-2 dark:border-gray-800'
      id='list'
    >
      <div className='grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        {loading ? (
          <div id='card-list-loading' className='contents'>
            {[...Array(8)].map((_, index) => (
              <LoadingSkeleton
                key={`normal-list-loading-skeleton-${index}`}
                className='h-32 w-full'
              />
            ))}
          </div>
        ) : (
          rows.map((card, rowIndex) => (
            <div
              key={`list-card-${rowIndex}`}
              id='list-card'
              className='dark:bg-irmin_black-600 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 text-xs md:text-sm xl:text-base dark:border-gray-900'
            >
              <div className='flex flex-wrap items-center justify-between gap-4'>
                {card.columns.map((column, index) => (
                  <div
                    key={`card-${rowIndex}-row-${index}`}
                    className='contents'
                  >
                    {column}
                  </div>
                ))}
              </div>
              {card.actions && card.actions.length > 0 && !noActions && (
                <div className='mt-4 flex items-center justify-between space-x-2'>
                  <div className='flex-card flex justify-start'>
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
                          key={`list-card-${rowIndex}-actions-${index}`}
                          variant={action.primary ? 'gray' : 'link'}
                          aria-label={action.label}
                          href={action.href}
                          onClick={action.onClick}
                          className={`w-max ${action.primary ? 'min-w-24' : ''}`}
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
                          <TbChevronUp className='h-5 w-5' />
                        ) : (
                          <TbChevronDown className='h-5 w-5' />
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
            title={dict.list.emptyState.generic.title}
            description={dict.list.emptyState.generic.description}
            size='sm'
            className='py-8'
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(CardList);
