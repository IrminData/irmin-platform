'use client';

import DashboardTitleAndSelector from '@/components/dashboardTitleAndSelector';
import BarChart from '@/components/widgets/barChart';
import LineChart from '@/components/widgets/lineChart';
import ScrollableTable from '@/components/widgets/scrollableTable';
import { Visualisation } from '@/types/DataSet';

export default function DashboardHome() {
  const visualisations: Visualisation[] = [
    {
      id: 1,
      type: 'table',
      title: 'Monthly Sales',
      data: {
        labels: ['January', 'February', 'March', 'April'],
        datasets: [
          {
            label: 'Sales',
            data: [65, 59, 80, 81],
          },
          {
            label: 'Expenses',
            data: [28, 48, 40, 19],
          },
          {
            label: 'Profit',
            data: [38, 38, 30, 40],
          },
          {
            label: 'Investments',
            data: [10, 20, 10, 20],
          },
        ],
      },
    },
    {
      id: 2,
      type: 'line',
      title: 'Monthly Sales',
      data: {
        labels: ['January', 'February', 'March', 'April'],
        datasets: [
          {
            label: 'Sales',
            data: [65, 59, 80, 81],
            backgroundColor: '#aec3b0',
            borderColor: '#aec3b0',
          },
        ],
      },
    },
    {
      id: 2,
      type: 'line',
      title: 'Monthly Sales',
      data: {
        labels: ['January', 'February', 'March', 'April'],
        datasets: [
          {
            label: 'Sales',
            data: [65, 59, 80, 81],
            backgroundColor: '#aec3b0',
            borderColor: '#aec3b0',
          },
        ],
      },
    },
  ];
  return (
    <>
      <DashboardTitleAndSelector
        title='Dashboards'
        options={['Dashboard 1', 'Dashboard 2', 'Create New']}
        selected={'Dashboard 1'}
        onSelectionChange={(value) => console.log('Selection changed', value)}
      />
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {visualisations.map((visualisation) => {
          switch (visualisation.type) {
            case 'table':
              return (
                <ScrollableTable
                  key={`visualisation-${visualisation.id}-${visualisation.type}`}
                  visualisation={visualisation}
                />
              );
            case 'line':
              return (
                <LineChart
                  key={`visualisation-${visualisation.id}-${visualisation.type}`}
                  visualisation={visualisation}
                />
              );
            case 'bar':
              return (
                <BarChart
                  key={`visualisation-${visualisation.id}-${visualisation.type}`}
                  visualisation={visualisation}
                />
              );
            default:
              return (
                <div
                  key={`visualisation-${visualisation.id}-${visualisation.type}`}
                />
              );
          }
        })}
      </div>
    </>
  );
}
