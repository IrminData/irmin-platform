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
    size: {
      w: 1,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    type: 'line',
    title: 'Monthly Sales Trend',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Sales',
          data: [65, 59, 80, 81, 56, 55, 40],
        },
      ],
    },
    size: {
      w: 2,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 9,
    type: 'metric',
    title: 'Customer Satisfaction',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      currentValue: 85,
      label: 'Satisfaction Score',
    },
    size: {
      w: 1,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    type: 'bar',
    title: 'Quarterly Sales Comparison',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Sales',
          data: [150, 200, 180, 220],
        },
      ],
    },
    size: {
      w: 1,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    type: 'table',
    title: 'Financial Overview',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: [
        'January 2024',
        'February 2024',
        'March 2024',
        'April 2024',
        'May 2024',
        'June 2024',
        'July 2024',
        'August 2024',
        'September 2024',
        'October 2024',
        'November 2024',
        'December 2024',
      ],
      datasets: [
        {
          label: 'Sales',
          data: [65, 59, 80, 81, 56, 55, 40, 60, 55, 45, 50, 70],
        },
        {
          label: 'Expenses',
          data: [28, 48, 40, 19, 86, 27, 90, 50, 30, 40, 60, 70],
        },
        {
          label: 'Profit',
          data: [38, 38, 30, 40, 36, 37, 40, 40, 40, 40, 40, 40],
        },
        {
          label: 'Investments',
          data: [10, 20, 10, 20, 10, 20, 10, 20, 10, 20, 10, 20],
        },
        {
          label: 'Net Income',
          data: [28, 28, 20, 30, 26, 27, 30, 30, 30, 30, 30, 30],
        },
        {
          label: 'Gross Margin',
          data: [30, 35, 33, 36, 30, 32, 35, 35, 35, 35, 35, 35],
        },
        {
          label: 'ROI',
          data: [20, 25, 23, 26, 20, 22, 25, 25, 25, 25],
        },
        {
          label: 'ROE',
          data: [15, 20, 18, 20, 15, 17, 20, 20, 20, 20],
        },
      ],
    },
    size: {
      w: 3,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 8,
    type: 'line',
    title: 'Yearly Growth',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['2018', '2019', '2020', '2021', '2022', '2024'],
      datasets: [
        {
          label: 'Growth',
          data: [10, 20, 30, 40, 50, 60],
        },
      ],
    },
    size: {
      w: 2,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 4,
    type: 'pie',
    title: 'Sales Distribution by Product',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['Product A', 'Product B', 'Product C', 'Product D'],
      datasets: [
        {
          label: 'Sales',
          data: [300, 500, 200, 100],
        },
      ],
    },
    size: {
      w: 1,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    type: 'pie',
    title: 'Revenue Breakdown by Quarter',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Revenue',
          data: [1500, 2000, 1800, 2200],
        },
      ],
    },
    size: {
      w: 1,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    type: 'radar',
    title: 'Performance Metrics Analysis',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['Metric 1', 'Metric 2', 'Metric 3', 'Metric 4', 'Metric 5'],
      datasets: [
        {
          label: 'Current',
          data: [20, 30, 40, 50, 60],
        },
        {
          label: 'Target',
          data: [25, 35, 45, 55, 65],
        },
      ],
    },
    size: {
      w: 2,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 7,
    type: 'bar',
    title: 'Market Share by Region',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: ['North America', 'Europe', 'Asia', 'South America', 'Africa'],
      datasets: [
        {
          label: 'Market Share',
          data: [40, 30, 20, 10, 5],
        },
      ],
    },
    size: {
      w: 2,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 10,
    type: 'table',
    title: 'Quarterly Financial Summary',
    dashboards: !last ? dashboards(true) : undefined,
    data: {
      labels: [
        'Q1 22',
        'Q2 22',
        'Q3 22',
        'Q4 22',
        'Q1 23',
        'Q2 23',
        'Q3 23',
        'Q4 23',
      ],
      datasets: [
        {
          label: 'Revenue',
          data: [1500, 2000, 1800, 2200, 2500, 2300, 2700, 3000],
        },
        {
          label: 'Expenses',
          data: [500, 700, 600, 800, 900, 750, 950, 1000],
        },
        {
          label: 'Profit',
          data: [1000, 1300, 1200, 1400, 1600, 1550, 1750, 2000],
        },
        {
          label: 'Investments',
          data: [300, 400, 350, 450, 500, 400, 500, 600],
        },
        {
          label: 'Net Income',
          data: [700, 900, 850, 950, 1100, 1150, 1250, 1400],
        },
        {
          label: 'Gross Margin',
          data: [30, 35, 33, 36, 40, 38, 42, 45],
        },
      ],
    },
    size: {
      w: 4,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
