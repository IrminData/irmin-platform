import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Widget } from '@/types/api/Widget';

import { dashboards } from './dashboards';

/**
 * Get example widgets for the dashboard
 *
 * Array of {@link Widget}
 *
 * @param last - If true, the item will avoid having children
 */
export const widgets = (last = false): Widget[] => [
  {
    id: 0,
    type: 'metric',
    title: 'Total Sales',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      currentValue: 1000,
      label: '2024 Sales in USD',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    type: 'line',
    title: 'Monthly Sales 1',
    dashboards: !last ? dashboards(true) : undefined,
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
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    type: 'bar',
    title: 'Monthly Sales 2',
    dashboards: !last ? dashboards(true) : undefined,
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
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    type: 'table',
    title: 'Monthly Sales 5',
    dashboards: !last ? dashboards(true) : undefined,
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
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
