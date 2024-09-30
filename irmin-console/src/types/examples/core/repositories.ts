import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Repository } from '@/types/core/Repository';

import { collections } from './collections';
import { workspaceUsers } from './users';

/**
 * Get example Repositories
 *
 * Array of {@link Repository}
 */
export const repositories = (): Repository[] => [
  {
    id: '0',
    name: 'KPIs and Performance Metrics',
    slug: 'kpi-and-performance-metrics',
    description:
      'This is an example of a Repository that has been created manually.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter(
        (item) =>
          item.formatted_name === 'excel-kpis.sales' ||
          item.formatted_name === 'management-data-from-excel.inventory' ||
          item.formatted_name === 'excel-kpis.expenses' ||
          item.formatted_name === 'excel-kpis.profit_by_month' ||
          item.formatted_name === 'management-data-from-excel.employees'
      ),
    ],
    owner: workspaceUsers()[0],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '1',
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    description:
      'This is an example of a Repository that has been created by the Google Analytics Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter(
        (item) => item.repository === 'main-google-analytics'
      ),
    ],
    owner: workspaceUsers()[0],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '2',
    name: 'App data',
    slug: 'app-data',
    description:
      'This is an example of a Repository that has been created by an Action Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter((item) => item.repository === 'app-data'),
    ],
    owner: workspaceUsers()[1],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '3',
    name: 'Excel KPIs',
    slug: 'kpis-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter((item) => item.repository === 'excel-kpis'),
    ],
    owner: workspaceUsers()[2],
    is_immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '4',
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter(
        (item) => item.repository === 'management-data-from-excel'
      ),
    ],
    is_immutable: false,
    owner: workspaceUsers()[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '5',
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '# Explain here what this repository is\n\n## Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    collections: [
      ...collections().filter(
        (item) => item.repository === 'google-sheets-kpis'
      ),
    ],
    is_immutable: false,
    owner: workspaceUsers()[0],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '6',
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    description: '',
    documentation: '',
    collections: [
      ...collections().filter(
        (item) => item.repository === 'top-100-ad-clicking-users'
      ),
    ],
    is_immutable: false,
    owner: workspaceUsers()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '7',
    name: 'Whale behaviour and Sales trends',
    slug: 'whale-behaviour-and-sales-trends',
    description: 'Example of a repository with ad click and sales trends',
    documentation:
      'This repository contains data on ad clicks and sales trends',
    collections: [
      ...collections().filter(
        (item) =>
          item.formatted_name ===
            'top-100-ad-clicking-users.top-100-ad-clicking-users' ||
          item.formatted_name === 'google-sheets-kpis.sales' ||
          item.formatted_name === 'app-data.purchase_events'
      ),
    ],
    is_immutable: false,
    owner: workspaceUsers()[3],
    created_at: getRandomDateTimeString(100, 'past', 20),
    updated_at: getRandomDateTimeString(10, 'past', 5),
  },
];
