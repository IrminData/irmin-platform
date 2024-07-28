'use client';

import { useEffect, useState } from 'react';

import DashboardTitleAndSelector from '@/components/dashboards/dashboardTitleAndSelector';
import BarChart from '@/components/dashboards/widgets/barChart';
import LineChart from '@/components/dashboards/widgets/lineChart';
import Metric from '@/components/dashboards/widgets/metric';
import ScrollableTable from '@/components/dashboards/widgets/scrollableTable';
import Button from '@/components/misc/Button';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

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
 *
 * @returns UI fto show dashboards
 */
export default function DashboardsPage() {
  const { dict } = useLocale();
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(
    null
  );
  const workspace = useWorkspace();

  useEffect(() => {
    if (
      !selectedDashboard &&
      !workspace.dashboards.isLoading &&
      workspace.dashboards.dashboards
    ) {
      if (workspace.dashboards.dashboards.length > 0) {
        setSelectedDashboard(workspace.dashboards.dashboards[0]);
      } else {
        // TODO: Prompt user to create a new dashboard
      }
    }
  }, [workspace.dashboards, selectedDashboard]);

  if (workspace.dashboards.isLoading || !workspace.dashboards.dashboards) {
    return <LoadingSkeleton className='h-96 w-full' />;
  }
  return (
    <div className='px-0 lg:px-4'>
      {workspace.dashboards.isLoading && (
        <LoadingSkeleton className='h-96 w-full' />
      )}
      {workspace.dashboards.dashboards.length === 0 &&
        !workspace.dashboards.isLoading && (
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
      {selectedDashboard && (
        <>
          <DashboardTitleAndSelector
            title={selectedDashboard?.name ?? dict.dashboard.dashboard}
            options={workspace.dashboards.dashboards}
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
    </div>
  );
}
