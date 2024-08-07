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
    <div
      id='dashboard-title-and-selector'
      className='flex items-center justify-between pb-8 pr-4 pt-6 md:pb-8 md:pt-12'
    >
      <div
        className={`px-4 text-lg font-medium text-irmin_black text-opacity-80 md:text-3xl`}
      >
        <h1>{title}</h1>
      </div>
      <div id='dashboard-selector ml-auto w-max min-w-28 max-w-[50%]'>
        <p className='z-10 -mb-2 px-2 text-xs text-gray-400'>
          {dict.dashboard.dashboard}
        </p>
        <div className='group rounded border border-gray-200 bg-white px-2 py-2 text-xs leading-tight text-gray-700 shadow-sm transition-all hover:bg-gray-100 md:text-sm'>
          <select
            value={selected?.name ?? 'create-new'}
            onChange={(e) => processSelectionChange(e.target.value)}
            className='block w-full cursor-pointer transition-all focus:outline-none group-hover:bg-gray-100'
            onClick={(e) => {
              if (e.currentTarget.value === 'create-new') {
                e.preventDefault();
                createNew();
              }
            }}
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
    </div>
  );
}

export default DashboardTitleAndSelector;
