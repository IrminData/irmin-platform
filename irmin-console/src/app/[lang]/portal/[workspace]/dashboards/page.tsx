'use client';

import { useEffect, useState } from 'react';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import DashboardTitleAndSelector from '@/components/dashboard/DashboardTitleAndSelector';
import BarChart from '@/components/dashboard/widget/widgets/BarChart';
import LineChart from '@/components/dashboard/widget/widgets/LineChart';
import Metric from '@/components/dashboard/widget/widgets/Metric';
import ScrollableTable from '@/components/dashboard/widget/widgets/ScrollableTable';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';

/**
 * Portal dashboards page
 *
 * @remarks
 *
 * This page is used to show and manage dashboards of the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage dashboard data.
 * It uses the DashboardTitleAndSelector component to show the dashboard
 * title and dashboard selector.
 *
 * It uses the widgets components to show the widgets of the selected dashboard.
 * Widgets can be found here: `src/components/widgets`
 */
export default function DashboardsPage() {
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
      <div id='dashboards-loading-skeleton'>
        <LoadingSkeleton className='min-h-[80vh]' />
      </div>
    );
  }

  return (
    <div className='px-0 lg:px-4'>
      {selectedDashboard && (
        <>
          <DashboardTitleAndSelector
            title={selectedDashboard?.name ?? dict.dashboard.dashboard}
            options={dashboards}
            selected={selectedDashboard}
            onSelectionChange={(value) => {
              setSelectedDashboard(value);
            }}
            createNew={() => {
              // TODO: Implement create new dashboard
            }}
          />
          <div className='grid grid-cols-1 gap-8 px-4 pb-[100px] xl:grid-cols-2'>
            {selectedDashboard.widgets.map((widget) => {
              switch (widget.type) {
                case 'table':
                  return (
                    <ScrollableTable
                      key={`widget-${widget.id}-${widget.type}`}
                      widget={widget}
                    />
                  );
                case 'line':
                  return (
                    <LineChart
                      key={`widget-${widget.id}-${widget.type}`}
                      widget={widget}
                    />
                  );
                case 'bar':
                  return (
                    <BarChart
                      key={`widget-${widget.id}-${widget.type}`}
                      widget={widget}
                    />
                  );
                case 'metric':
                  return (
                    <Metric
                      key={`widget-${widget.id}-${widget.type}`}
                      widget={widget}
                    />
                  );
              }
            })}
          </div>
        </>
      )}
      {dashboards.length === 0 && (
        <div className='flex h-96 flex-col items-center justify-center gap-4'>
          <p className='text-xl font-semibold text-irmin_black'>
            {dict.dashboard.noDashboards}
          </p>
          <Button
            variant='solid'
            colorScheme='secondary'
            size='md'
            onClick={() => {
              // TODO: Implement create new dashboard
            }}
          >
            {dict.dashboard.createNewDashboard}
          </Button>
        </div>
      )}
    </div>
  );
}
