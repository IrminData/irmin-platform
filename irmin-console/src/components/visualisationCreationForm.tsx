'use client';

import React, { useState } from 'react';

import { BsBarChart, BsGraphUp, BsSpeedometer, BsTable } from 'react-icons/bs';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

const VisualisationCreationForm = () => {
  const { dict } = useLocale();

  const [visualisationName, setVisualisationName] = useState('');
  const [dashboard, setDashboard] = useState('');
  const [visualisation, setVisualisation] = useState('table');

  // Visualisation options
  const visualisationOptions = [
    { label: dict.visualisation.create.table, type: 'table', icon: BsTable },
    { label: dict.visualisation.create.bar, type: 'bar', icon: BsBarChart },
    { label: dict.visualisation.create.line, type: 'line', icon: BsGraphUp },
    {
      label: dict.visualisation.create.metric,
      type: 'metric',
      icon: BsSpeedometer,
    },
  ];

  return (
    <div className='space-y-4 p-4'>
      <div>
        <label
          htmlFor='tileName'
          className='block text-sm font-medium text-gray-700'
        >
          {dict.visualisation.create.visualisationName}
        </label>
        <Input
          variant='solid'
          colorScheme='black'
          type='text'
          id='visualisationName'
          defaultValue={visualisationName}
          onChange={(e) => setVisualisationName(e.target.value)}
          placeholder='eg. monthly sales chart'
          className='mt-2 block w-full'
        />
      </div>

      <div>
        <label
          htmlFor='dashboard'
          className='block text-sm font-medium text-gray-700'
        >
          {dict.visualisation.create.saveToDashboard}
        </label>
        <select
          id='dashboard'
          value={dashboard}
          onChange={(e) => setDashboard(e.target.value)}
          className='mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
        >
          <option>{dict.visualisation.create.selectDashboard}</option>
          <option>Dashboard 1</option>
          <option>Dashboard 2</option>
        </select>
      </div>

      <div>
        <label
          htmlFor='visualisation'
          className='block text-sm font-medium text-gray-700'
        >
          {dict.visualisation.create.visualisationType}
        </label>
        <div className='relative mt-1'>
          <select
            id='visualisation'
            value={visualisation}
            onChange={(e) => setVisualisation(e.target.value)}
            className='mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
          >
            {visualisationOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button size='md' colorScheme='primary' variant='solid'>
        {dict.visualisation.create.createVisualisation}
      </Button>
    </div>
  );
};

export default VisualisationCreationForm;
