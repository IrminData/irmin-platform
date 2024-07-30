'use client';

import { useState } from 'react';

import { BsBarChart, BsGraphUp, BsSpeedometer, BsTable } from 'react-icons/bs';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

/**
 * Widget creation form
 *
 * @remarks
 *
 * This component is used to create a new widget in the dashboard.
 * It allows users to select the widget type, name, and dashboard to save the widget.
 *
 * @todo Implement the widget creation functionality
 */
const WidgetCreationForm = () => {
  const { dict } = useLocale();

  const [widgetName, setWidgetName] = useState('');
  const [dashboard, setDashboard] = useState('');
  const [widget, setWidget] = useState('table');

  // Widget options
  const widgetOptions = [
    { label: dict.widget.create.table, type: 'table', icon: BsTable },
    { label: dict.widget.create.bar, type: 'bar', icon: BsBarChart },
    { label: dict.widget.create.line, type: 'line', icon: BsGraphUp },
    {
      label: dict.widget.create.metric,
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
          {dict.widget.create.widgetName}
        </label>
        <Input
          variant='solid'
          colorScheme='black'
          type='text'
          id='widgetName'
          defaultValue={widgetName}
          onChange={(e) => setWidgetName(e.target.value)}
          placeholder='eg. monthly sales chart'
          className='mt-2 block w-full'
        />
      </div>

      <div>
        <label
          htmlFor='dashboard'
          className='block text-sm font-medium text-gray-700'
        >
          {dict.widget.create.saveToDashboard}
        </label>
        <select
          id='dashboard'
          value={dashboard}
          onChange={(e) => setDashboard(e.target.value)}
          className='mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
        >
          <option>{dict.widget.create.selectDashboard}</option>
          <option>Dashboard 1</option>
          <option>Dashboard 2</option>
        </select>
      </div>

      <div>
        <label
          htmlFor='widget'
          className='block text-sm font-medium text-gray-700'
        >
          {dict.widget.create.widgetType}
        </label>
        <div className='relative mt-1'>
          <select
            id='widget'
            value={widget}
            onChange={(e) => setWidget(e.target.value)}
            className='mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none sm:text-sm'
          >
            {widgetOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button size='md' colorScheme='primary' variant='solid'>
        {dict.widget.create.createWidget}
      </Button>
    </div>
  );
};

export default WidgetCreationForm;
