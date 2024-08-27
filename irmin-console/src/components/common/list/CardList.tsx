'use client';

import { useState } from 'react';

import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

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
const CardList = ({ rows, loading = false }: ListProps) => {
  const [openDetails, setOpenDetails] = useState<number[]>([]);

  return (
    <div className='scrollbar-hide h-full w-full overflow-scroll' id='list'>
      <div className='grid grid-cols-1 items-start gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3'>
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
              className='flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-2 py-4 text-xs shadow-sm md:text-sm xl:text-base dark:border-gray-900 dark:bg-irmin_black-600'
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
              {card.actions && card.actions.length > 0 && (
                <div className='mt-4 flex items-center justify-end space-x-2'>
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
                          size={'sm'}
                          key={`list-card-${rowIndex}-actions-${index}`}
                          variant={action.primary ? 'solid' : 'link'}
                          colorScheme='secondary'
                          ariaLabel={action.label}
                          href={action.href}
                          onClick={action.onClick}
                          className={`w-max ${action.primary ? 'min-w-24 py-2' : 'dark:text-gray-400'}`}
                        >
                          {action.label}
                        </Button>
                      ))}
                  </div>
                  {card.details && (
                    <div>
                      <Button
                        size='md'
                        variant='link'
                        colorScheme='secondary'
                        className='m-0 p-0'
                        onClick={() => {
                          if (openDetails.includes(rowIndex)) {
                            setOpenDetails(
                              openDetails.filter((id) => id !== rowIndex)
                            );
                          } else {
                            setOpenDetails([...openDetails, rowIndex]);
                          }
                        }}
                        ariaLabel={
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
                    </div>
                  )}
                </div>
              )}
              {card.details && openDetails.includes(rowIndex) && (
                <div className='mt-0 rounded-lg bg-gray-50 p-4 shadow-inner'>
                  {card.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CardList;
