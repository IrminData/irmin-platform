'use client';

import { useEffect, useState } from 'react';

import DashboardTitleAndSelector from '@/components/dashboards/dashboardTitleAndSelector';
import BarChart from '@/components/dashboards/widgets/barChart';
import LineChart from '@/components/dashboards/widgets/lineChart';
import Metric from '@/components/dashboards/widgets/metric';
import ScrollableTable from '@/components/dashboards/widgets/scrollableTable';
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
    if (!selectedDashboard && !workspace.dashboards.isLoading) {
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
      {selectedDashboard ? (
        <div className='grid grid-cols-1 gap-8 pb-[100px] xl:grid-cols-2'>
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
      ) : (
        <LoadingSkeleton className='h-96 w-full' />
      )}
    </div>
  );
}
