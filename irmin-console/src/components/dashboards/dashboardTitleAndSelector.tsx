import React from 'react';

import Image from 'next/image';

import { TbChevronDown } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { Dashboard } from '@/types/api/Dashboard';

/**
 * Dashboard title and selector
 *
 * @remarks
 *
 * This component is used to display the title of the dashboard and a selector to switch between dashboards.
 */
function DashboardTitleAndSelector({
  title,
  options,
  selected,
  onSelectionChange,
  createNew,
}: {
  title: string;
  options: Dashboard[];
  selected: Dashboard | null;
  onSelectionChange: (_selection: Dashboard) => void;
  createNew: () => void;
}) {
  const { dict } = useLocale();
  const processSelectionChange = (value: string) => {
    if (value === 'create-new') {
      createNew();
    } else {
      const id = parseInt(value);
      const selectedDashboards = options.filter((val) => val.id === id);
      if (selectedDashboards.length > 0)
        onSelectionChange(selectedDashboards[0]);
    }
  };
  return (
    <div className='flex items-center justify-between p-4 align-top'>
      <div className={`text-lg font-bold text-gray-800 md:text-3xl`}>
        <Image
          src='/irmin-logo.svg'
          alt='Irmin'
          width={120}
          height={120}
          className={`h-14 md:hidden`}
        />
        <h1>{title}</h1>
      </div>

      <div className='relative'>
        <select
          defaultValue={selected?.id ?? 'create-new'}
          onChange={(e) => processSelectionChange(e.target.value)}
          className='block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-8 leading-tight text-gray-700 focus:outline-none'
        >
          {options.map((option, index) => (
            <option key={index} value={option.id}>
              {option.name}
            </option>
          ))}
          <option value={-1}>{dict.dashboard.createNewDashboard}</option>
        </select>
        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700'>
          <TbChevronDown className='h-4 w-4' />
        </div>
      </div>
    </div>
  );
}

export default DashboardTitleAndSelector;
