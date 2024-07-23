'use client';

import React from 'react';

import { IoSettings } from 'react-icons/io5';

import Button from '@/components/misc/Button';

import { MetricData, Widget } from '@/types/api/Widget';

const Metric = ({ widget }: { widget: Widget }) => {
  if (widget.type !== 'metric') return <></>;
  const widgetData = widget.data as MetricData;

  return (
    <div className='rounded border-t-2 border-irmin_green bg-white p-2 shadow-lg md:p-4'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h2 className='text-xl font-semibold leading-tight'>{widget.title}</h2>
        <Button
          variant='icon'
          colorScheme='primary'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={18} />
        </Button>
      </div>
      <div className='flex flex-col items-center justify-center py-6'>
        <span className='text-4xl font-bold'>{widgetData.currentValue}</span>
        <span className='text-lg text-gray-500'>{widgetData.label}</span>
      </div>
    </div>
  );
};

export default Metric;
