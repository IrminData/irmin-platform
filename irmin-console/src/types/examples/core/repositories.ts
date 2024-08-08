import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Repository } from '@/types/api/Repository';

import { workspaceUsers } from './users';
import { workflows } from './workflows';

/**
 * Get example Repositories
 *
 * Array of {@link Repository}
 *
 * @param last - If true, the items will avoid having children
 */
export const repositories = (last = false): Repository[] => [
  {
    id: 0,
    name: 'KPIs and Performance Metrics',
    slug: 'kpi-and-performance-metrics',
    description:
      'This is an example of a Repository that has been created manually.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales.0',
      'management-data-from-excel.inventory.0',
      'excel-kpis.expenses.0',
      'excel-kpis.profit_by_month.0',
      'management-data-from-excel.employees.0',
    ],
    owner: workspaceUsers()[0],
    workflow: null,
    immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    description:
      'This is an example of a Repository that has been created by the Google Analytics Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'main-google-analytics.sessions.0',
      'main-google-analytics.users.0',
      'main-google-analytics.pageviews.0',
      'main-google-analytics.events.0',
    ],
    owner: workspaceUsers()[0],
    workflow: !last ? workflows(true)[0] : undefined,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    description:
      'This is an example of a Repository that has been created by an Action Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'app-usage-data.users.0',
      'app-usage-data.downloads.0',
      'app-usage-data.sessions.0',
      'app-usage-data.purchase_events.0',
      'app-usage-data.ad_clicks.0',
      'app-usage-data.ad_impressions.0',
    ],
    owner: workspaceUsers()[1],
    workflow: !last ? workflows(true)[2] : undefined,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Excel KPIs',
    slug: 'excel-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales.0',
      'excel-kpis.expenses.0',
      'excel-kpis.profit_by_month.0',
    ],
    owner: workspaceUsers()[2],
    workflow: !last ? workflows(true)[4] : undefined,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 4,
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'management-data-from-excel.inventory.0',
      'management-data-from-excel.employees.0',
    ],
    workflow: !last ? workflows(true)[5] : undefined,
    immutable: true,
    owner: workspaceUsers()[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'google-sheets-kpis.sales.0',
      'google-sheets-kpis.inventory.0',
      'google-sheets-kpis.expenses.0',
      'google-sheets-kpis.profit_by_month.0',
      'google-sheets-kpis.employees.0',
    ],
    workflow: !last ? workflows(true)[6] : undefined,
    immutable: true,
    owner: workspaceUsers()[0],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    description: '',
    documentation: '',
    tables: [],
    workflow: !last ? workflows(true)[1] : undefined,
    immutable: true,
    owner: workspaceUsers()[1],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 7,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    description: '',
    documentation: '',
    tables: [],
    workflow: !last ? workflows(true)[3] : undefined,
    immutable: true,
    owner: workspaceUsers()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 8,
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    description: '',
    documentation: '',
    tables: ['top-100-ad-clicking-users.top-100-ad-clicking-users.0'],
    workflow: !last ? workflows(true)[7] : undefined,
    immutable: true,
    owner: workspaceUsers()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 9,
    name: 'Whale behaviour and Sales trends',
    slug: 'whale-behaviour-and-sales-trends',
    description: 'Example of a repository with ad click and sales trends',
    documentation:
      'This repository contains data on ad clicks and sales trends',
    tables: [
      'top-100-ad-clicking-users.top-100-ad-clicking-users.0',
      'google-sheets-kpis.sales.0',
      'app-usage-data.purchase_events.0',
    ],
    workflow: null,
    immutable: false,
    owner: workspaceUsers()[3],
    created_at: getRandomDateTimeString(100, 'past', 20),
    updated_at: getRandomDateTimeString(10, 'past', 5),
  },
];
