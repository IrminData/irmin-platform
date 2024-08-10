import Select from '@/components/common/select/Select';

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
      const selectedDashboards = options.filter((val) => val.slug === value);
      if (selectedDashboards.length > 0)
        onSelectionChange(selectedDashboards[0]);
    }
  };
  return (
    <div
      id='dashboard-title-and-selector'
      className='flex items-center justify-between pb-8 pr-4 pt-6 md:pb-8 md:pt-8'
    >
      <div
        className={`px-4 text-lg font-medium text-irmin_black text-opacity-80 md:text-3xl`}
      >
        <h1>{title}</h1>
      </div>
      <div id='dashboard-selector ml-auto w-max min-w-28 max-w-[50%]'>
        <Select
          label={dict.dashboard.dashboard}
          onChange={(e) => {
            processSelectionChange(e.target.value);
          }}
          loading={false}
          currentValue={selected?.slug.toString() ?? ''}
          defaultValue={''}
          options={[
            { value: 'create-new', label: dict.dashboard.createNewDashboard },
            ...(options.map((option) => ({
              value: option.slug,
              label: option.name,
            })) ?? []),
          ]}
        />
      </div>
    </div>
  );
}

export default DashboardTitleAndSelector;
