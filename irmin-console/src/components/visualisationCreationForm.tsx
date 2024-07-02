'use client';

import React, { useState } from 'react';

import { BsBarChart, BsGraphUp, BsSpeedometer, BsTable } from 'react-icons/bs';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

const VisualisationCreationForm = () => {
  const [visualisationName, setVisualisationName] = useState('');
  const [dashboard, setDashboard] = useState('');
  const [visualisation, setVisualisation] = useState('Table');

  // Visualisation options
  const visualisationOptions = [
    { label: 'Table', icon: BsTable },
    { label: 'Bar', icon: BsBarChart },
    { label: 'Line', icon: BsGraphUp },
    { label: 'Metric', icon: BsSpeedometer },
  ];

  return (
    <div className='space-y-4 p-4'>
      <div>
        <label
          htmlFor='tileName'
          className='block text-sm font-medium text-gray-700'
        >
          Visualisation name
        </label>
        <Input
          variant='solid'
          colorScheme='black'
          type='text'
          id='visualisationName'
          defaultValue={visualisationName}
          onChange={(e) => setVisualisationName(e.target.value)}
          placeholder='eg. monthly sales chart'
          ariaLabel='Visualisation name'
          className='mt-2 block w-full'
        />
      </div>

      <div>
        <label
          htmlFor='dashboard'
          className='block text-sm font-medium text-gray-700'
        >
          Save to dashboard
        </label>
        <select
          id='dashboard'
          value={dashboard}
          onChange={(e) => setDashboard(e.target.value)}
          className='mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
        >
          <option>Select dashboard (optional)</option>
          <option>Dashboard 1</option>
          <option>Dashboard 2</option>
        </select>
      </div>

      <div>
        <label
          htmlFor='visualisation'
          className='block text-sm font-medium text-gray-700'
        >
          Visualisation type
        </label>
        <div className='relative mt-1'>
          <select
            id='visualisation'
            value={visualisation}
            onChange={(e) => setVisualisation(e.target.value)}
            className='mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
          >
            {visualisationOptions.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        size='md'
        colorScheme='primary'
        variant='solid'
        ariaLabel='Create a visualisation'
      >
        Create visualisation
      </Button>
    </div>
  );
};

export default VisualisationCreationForm;
