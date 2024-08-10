'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import DashboardTitleAndSelector from '@/components/dashboard/DashboardTitleAndSelector';
import WidgetSkeleton from '@/components/dashboard/widget/WidgetSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';

const BarChart = dynamic(
  () => import('@/components/dashboard/widget/widgets/BarChart'),
  {
    loading: () => <WidgetSkeleton />,
  }
);
const LineChart = dynamic(
  () => import('@/components/dashboard/widget/widgets/LineChart'),
  {
    loading: () => <WidgetSkeleton />,
  }
);
const Metric = dynamic(
  () => import('@/components/dashboard/widget/widgets/Metric'),
  {
    loading: () => <WidgetSkeleton />,
  }
);
const PieChart = dynamic(
  () => import('@/components/dashboard/widget/widgets/PieChart'),
  {
    loading: () => <WidgetSkeleton />,
  }
);
const RadarChart = dynamic(
  () => import('@/components/dashboard/widget/widgets/RadarChart'),
  {
    loading: () => <WidgetSkeleton />,
  }
);
const ScrollableTable = dynamic(
  () => import('@/components/dashboard/widget/widgets/ScrollableTable'),
  {
    loading: () => <WidgetSkeleton />,
  }
);

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
          <div className='flex flex-col gap-4 px-4 pb-24 md:grid md:grid-cols-4'>
            {selectedDashboard.widgets?.map((widget) => {
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
                case 'pie':
                  return (
                    <PieChart
                      key={`widget-${widget.id}-${widget.type}`}
                      widget={widget}
                    />
                  );
                case 'radar':
                  return (
                    <RadarChart
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
