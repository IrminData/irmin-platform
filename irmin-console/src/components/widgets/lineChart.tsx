'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { IoSettings } from 'react-icons/io5';
import { Visualisation } from '@/types/DataSet';

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

const LineChart = ({ visualisation }: { visualisation: Visualisation }) => {
  if (visualisation.type !== 'line') return <></>;
  return (
    <div className='rounded border-t-2 border-ash_gray p-4 shadow-lg'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h2 className='text-xl font-semibold leading-tight'>
          {visualisation.title}
        </h2>
        <button
          className='text-gray-200 transition duration-300 hover:text-ash_gray-600'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={20} />
        </button>
      </div>
      <div className='overflow-hidden overflow-y-scroll px-2 pb-2'>
        <Line
          data={visualisation.data}
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
