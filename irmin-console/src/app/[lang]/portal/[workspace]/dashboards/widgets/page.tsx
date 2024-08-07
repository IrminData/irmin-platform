'use client';

import { useEffect, useState } from 'react';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import WidgetCreationForm from '@/components/dashboard/widget/WidgetCreationForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';

export default function WidgetsPage() {
  const { dict } = useLocale();
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(
    null
  );
  const {
    workspaceLoading,
    dashboards: { dashboards, isLoading },
  } = useWorkspace();

  const loading = workspaceLoading || isLoading;

  useEffect(() => {
    if (!selectedDashboard && dashboards && dashboards.length > 0) {
      setSelectedDashboard(dashboards[0]);
    }
  }, [dashboards, selectedDashboard]);

  if (loading) {
    return (
      <div id='widgets-loading-skeleton'>
        <LoadingSkeleton className='min-h-[80vh]' />
      </div>
    );
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
