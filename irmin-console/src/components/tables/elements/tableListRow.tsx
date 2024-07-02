'use client';

import React, { useState } from 'react';

import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import Button from '@/components/misc/Button';

interface TableRowAction {
  label: string;
  primary: boolean;
  href?: string;
  onClick?: () => void;
}
interface TableListRowProps {
  children: React.ReactNode[];
  details?: React.ReactNode;
  actions?: TableRowAction[];
  inSidebar?: boolean;
  disableHover?: boolean;
}

const TableListRow: React.FC<TableListRowProps> = ({
  children: cells,
  details,
  actions = [],
  inSidebar = false,
  disableHover = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleRow = () => {
    setIsOpen(!isOpen);
  };

  const sortedActions = actions.slice().sort((a, b) => {
    if (a.primary && !b.primary) return 1;
    if (!a.primary && b.primary) return -1;
    return 0;
  });

  return (
    <div id='table-list-row'>
      <div
        className={`flex w-fit min-w-full flex-row justify-start gap-4 text-pretty px-4 py-4 text-xs transition-all ${!disableHover && 'hover:bg-gray-200'} md:text-sm xl:text-base`}
      >
        {cells.map((cell, index) => (
          <div key={index} className='w-fit overflow-hidden'>
            {cell}
          </div>
        ))}
        {!inSidebar && (
          <div className='ml-4 w-fit text-right'>
            <div className='flex items-center justify-end space-x-2'>
              {sortedActions.map((action, index) => (
                <Button
                  size={'sm'}
                  key={`action-${index}`}
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
              {details && (
                <Button
                  size='md'
                  variant='link'
                  colorScheme='secondary'
                  onClick={toggleRow}
                  className='ml-2 mt-1'
                  ariaLabel={isOpen ? 'Hide details' : 'Show details'}
                >
                  {isOpen ? (
                    <IoChevronUpOutline className='h-5 w-5' />
                  ) : (
                    <IoChevronDownOutline className='h-5 w-5' />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {isOpen && details && (
        <div className='flex flex-row justify-start gap-1 bg-gray-100 shadow-inner'>
          <div className='w-full px-10 py-2'>{details}</div>
        </div>
      )}
    </div>
  );
};

export default TableListRow;
