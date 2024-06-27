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
      type: 'line',
      title: 'Monthly Sales 1',
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
      type: 'bar',
      title: 'Monthly Sales 2',
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
      id: 3,
      type: 'line',
      title: 'Monthly Sales 3',
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
      id: 4,
      type: 'bar',
      title: 'Monthly Sales 4',
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
      id: 5,
      type: 'table',
      title: 'Monthly Sales 5',
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
      id: 6,
      type: 'table',
      title: 'Monthly Sales 6',
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
  ];
  return (
    <>
      <DashboardTitleAndSelector
        title='Dashboards'
        options={['Dashboard 1', 'Dashboard 2', 'Create New']}
        selected={'Dashboard 1'}
        onSelectionChange={(value) => console.log('Selection changed', value)}
      />
      <div className='grid grid-cols-1 gap-8 pb-[100px] xl:grid-cols-2'>
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
          }
        })}
      </div>
    </>
  );
}
