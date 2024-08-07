'use client';

import React, { useState } from 'react';

import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

import { NormalListProps } from '@/types/internal/NormalListProps';

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
const NormalList: React.FC<NormalListProps> = ({
  rows,
  headers,
  hideHeaders = false,
}) => {
  const [openDetails, setOpenDetails] = useState<number[]>([]);
  const totalColumns = headers.length;
  return (
    <div className='scrollbar-hide h-full w-full overflow-scroll'>
      <div
        className={`grid grid-cols-${totalColumns} box-border h-full w-full min-w-max items-center text-left font-light text-irmin_black`}
        id='list'
      >
        {!hideHeaders && (
          <div className='contents'>
            {headers.map((header, index) => (
              <div
                key={`list-header-${index}`}
                className={`col-span-1 border-b border-gray-200 p-2 text-xs font-normal md:text-sm lg:p-4 ${index === headers.length - 1 ? 'text-right' : ''}`}
              >
                <div>{header}</div>
              </div>
            ))}
          </div>
        )}
        {rows.map((row, rowIndex) => {
          const rowRendered: JSX.Element[] = [];
          row.columns.forEach((column, index) => {
            rowRendered.push(
              <div
                key={`list-row-${rowIndex}-column-${index}`}
                className='col-span-1 p-2 lg:p-4'
              >
                {column}
              </div>
            );
          });
          if (row.actions && row.actions.length > 0) {
            const sortedActions = row.actions.slice().sort((a, b) => {
              if (a.primary && !b.primary) return 1;
              if (!a.primary && b.primary) return -1;
              return 0;
            });
            rowRendered.push(
              <div
                key={`list-row-${rowIndex}-actions`}
                className='col-span-1 p-2 text-right lg:p-4'
              >
                <div className='flex items-center justify-end space-x-2'>
                  {sortedActions.map((action, index) => (
                    <Button
                      size={'sm'}
                      key={`list-row-${rowIndex}-actions-${index}`}
                      variant={action.primary ? 'solid' : 'link'}
                      colorScheme='secondary'
                      ariaLabel={action.label}
                      href={action.href}
                      onClick={action.onClick}
                      className={`w-max ${action.primary ? 'min-w-24 py-2' : ''}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                  {row.details && (
                    <Button
                      size='md'
                      variant='link'
                      colorScheme='secondary'
                      className='ml-2 mt-1'
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
                  )}
                </div>
              </div>
            );
          }
          if (row.details) {
            rowRendered.push(
              <div
                key={`list-row-${rowIndex}-details`}
                className={`bg-gray-100 px-10 py-2 shadow-inner col-span-${totalColumns} ${openDetails.includes(rowIndex) ? '' : 'hidden'}`}
              >
                {row.details}
              </div>
            );
          }
          return (
            <div
              key={`list-row-${rowIndex}`}
              className={`contents text-xs transition-all md:text-sm xl:text-base`}
            >
              {rowRendered}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NormalList;
