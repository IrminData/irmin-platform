import React from 'react';

import { useLocale } from '@/context/LocaleContext';

import { Dashboard } from '@/types/api/Dashboard';

import PortalTitle from '../portalTitle';

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
    <div className='flex items-center justify-between pr-4'>
      <PortalTitle title={title} />
      <div className='ml-auto w-max min-w-32 max-w-[50%] rounded border border-gray-300 bg-white px-2 py-1 text-xs leading-tight text-gray-700 shadow md:text-sm'>
        <select
          value={selected?.name ?? 'create-new'}
          onChange={(e) => processSelectionChange(e.target.value)}
          className='block w-full focus:outline-none'
        >
          {options.map((option, index) => (
            <option key={index} value={option.name}>
              {option.name}
            </option>
          ))}
          <option value={'create-new'}>
            {dict.dashboard.createNewDashboard}
          </option>
        </select>
      </div>
    </div>
  );
}

export default DashboardTitleAndSelector;
