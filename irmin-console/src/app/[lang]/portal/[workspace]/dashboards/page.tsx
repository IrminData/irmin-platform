'use client';

import { useEffect, useState } from 'react';

import DashboardTitleAndSelector from '@/components/dashboardTitleAndSelector';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import BarChart from '@/components/widgets/barChart';
import LineChart from '@/components/widgets/lineChart';
import Metric from '@/components/widgets/metric';
import ScrollableTable from '@/components/widgets/scrollableTable';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';

export default function DashboardHome() {
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
          console.log('create new dashboard');
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
