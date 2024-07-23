'use client';

import React from 'react';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { IoSettings } from 'react-icons/io5';

import Button from '@/components/misc/Button';

import { ChartOrTableData, Widget } from '@/types/api/Widget';

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({ widget }: { widget: Widget }) => {
  if (widget.type !== 'line') return <></>;
  const widgetData = widget.data as ChartOrTableData;
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
      <div className='min-w-full max-w-[calc(100vw-4px)] overflow-scroll align-middle'>
        <Line
          data={widgetData}
          options={{
            scales: {
              y: {
                beginAtZero: true,
              },
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
              },
            },
            maintainAspectRatio: false,
          }}
          style={{ height: '400px', width: '100%', maxHeight: '400px' }}
        />
      </div>
    </div>
  );
};

export default LineChart;
