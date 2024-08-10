'use client';

import { ReactNode } from 'react';

import { IoSettings } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

import { Widget } from '@/types/api/Widget';

interface WidgetWrapperProps {
  widget?: Widget;
  children: ReactNode;
}

/**
 * Universal widget wrapper
 *
 * @remarks
 *
 * This component is used to wrap any widget component on the dashboard.
 * It provides a consistent layout and styling for all widgets.
 */
const WidgetWrapper = ({ widget, children }: WidgetWrapperProps) => {
  return (
    <div
      className={`flex flex-col rounded-lg border-t-2 border-irmin_green bg-white p-4 pb-0 shadow-lg col-span-${widget?.size?.w ?? 2}`}
      id={`widget-${widget?.type ?? 'loading'}-${widget?.id ?? 0}`}
    >
      <div className='flex h-14 items-center justify-between border-b'>
        <h3 className='text-sm font-medium leading-tight lg:text-base'>
          {widget?.title ?? '...'}
        </h3>
        <Button
          variant='icon'
          colorScheme='gray'
          className='m-0 p-0'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={18} />
        </Button>
      </div>
      <div className='-mx-4 h-full overflow-scroll px-4'>{children}</div>
    </div>
  );
};

export default WidgetWrapper;
