'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { IoSettings } from 'react-icons/io5';

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  title: string;
  data: {
    labels: string[]; // x-axis labels e.g., ['January', 'February', 'March', ...]
    datasets: Array<{
      label: string; // Name of the dataset
      data: number[]; // Data points for the dataset
      backgroundColor: string; // Color for the dataset
      borderColor?: string; // Border color of the bar (optional)
    }>;
  };
}

const BarChart: React.FC<ChartProps> = ({ title, data }) => {
  return (
    <div className='p-4'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h2 className='text-xl font-semibold leading-tight'>{title}</h2>
        <button
          className='text-gray-200 transition duration-300 hover:text-ash_gray-600'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={20} />
        </button>
      </div>
      <div className='overflow-hidden overflow-y-scroll rounded-lg px-2 pb-2 shadow'>
        <Bar
          data={data}
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

export default BarChart;
