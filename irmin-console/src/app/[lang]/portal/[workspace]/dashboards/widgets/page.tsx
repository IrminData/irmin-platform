'use client';

import { useEffect, useState } from 'react';

import WidgetCreationForm from '@/components/dashboards/widgetCreationForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';

export default function DashboardWidgetsPage() {
  const { dict } = useLocale();
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(
    null
  );
  const { dashboards } = useWorkspace();

  useEffect(() => {
    if (!selectedDashboard && !dashboards.isLoading && dashboards.dashboards) {
      if (dashboards.dashboards.length > 0) {
        setSelectedDashboard(dashboards.dashboards[0]);
      } else {
        // TODO: Prompt user to create a new dashboard
      }
    }
  }, [dashboards, selectedDashboard]);

  if (dashboards.isLoading || !dashboards.dashboards) {
    return <></>;
  }

  return (
    <div className='grid grid-cols-2 gap-4'>
      <div>
        <h3 className='p-4 font-medium'>{dict.dashboard.addNewWidget}</h3>
        <WidgetCreationForm />
      </div>
    </div>
  );
}
