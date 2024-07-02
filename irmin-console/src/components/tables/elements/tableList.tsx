'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface TableListProps {
  headers?: string[];
  children: React.ReactNode;
  inSidebar?: boolean;
  className?: string;
}

const TableList: React.FC<TableListProps> = ({
  headers,
  children,
  inSidebar = false,
  className = '',
}) => {
  const tableClasses = `box-border h-full w-full pb-24 text-left font-light text-irmin_black ${className}`;
  return (
    <div id='table-list' className={cn(tableClasses.split(' '))}>
      <div className='scrollbar-hide box-border h-full w-full overflow-scroll'>
        {!inSidebar && headers ? (
          <div className='sticky top-0'>
            <div className='w-fit min-w-full border-b border-irmin_green text-xs shadow md:text-sm'>
              <div className='flex flex-row justify-start gap-4 px-4 py-2'>
                {headers.map((header, index) => (
                  <div key={index} className={`w-40 font-normal lg:w-60`}>
                    {header}
                  </div>
                ))}
                <div className='ml-auto w-60 text-right font-normal lg:w-80'>
                  Actions
                </div>
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}
        {children}
      </div>
    </div>
  );
};

export default TableList;
