import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
} from '@/types/api/Workflow';

import { connections } from './connections';
import { repositories } from './repositories';
import { workspaceUsers } from './users';

/**
 * Get example Workflows
 *
 * Array of {@link Workflow}
 */
export const workflows = (): Workflow[] => [
  {
    id: 0,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    owner: workspaceUsers()[0],
    description:
      'This an example Import Workflow for syncing Google Analytics data to a Repository.',
    documentation: '# Hello World! \n This is a test documentation.',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    workflowable_type: 'import',
    workflowable: {
      connection: connections().find(
        (c) => c.slug === 'main-google-analytics'
      )!,
      repository: repositories(true).find(
        (a) => a.slug === 'main-google-analytics'
      ),
      path: '/',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    owner: workspaceUsers()[1],
    description:
      'This an example Export Workflow for exporting a Repository to Google Sheets Import.',
    documentation: '# Hello World! \n This is a test documentation.',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    workflowable_type: 'export',
    workflowable: {
      connection: connections().find((c) => c.slug === 'google-sheets-kpis')!,
      repository: repositories(true).find(
        (a) => a.slug === 'kpi-and-performance-metrics'
      ),
      path: '/',
      recursive: false,
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    owner: workspaceUsers()[2],
    description:
      'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
    documentation: '# Hello World! \n This is a test documentation.',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    workflowable_type: 'action',
    workflowable: {
      path: '/fetch-app-usage-data.js',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    owner: workspaceUsers()[0],
    description:
      'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
    documentation: '# Hello World! \n This is a test documentation.',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'error',
    workflowable_type: 'action',
    workflowable: {
      path: '/send-receipt-on-order.js',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 4,
    name: 'KPIs from Excel',
    slug: 'kpis-from-excel',
    owner: workspaceUsers()[0],
    description:
      'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      '# Excel import explanation. \n Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(40, 'past', 10),
    next_run_at: null,
    status: 'running',
    workflowable_type: 'import',
    workflowable: {
      connection: connections().find((c) => c.slug === 'kpis-spreadsheet')!,
      repository: repositories(true).find((a) => a.slug === 'kpis-from-excel'),
      path: '/',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    owner: workspaceUsers()[3],
    description:
      'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    workflowable_type: 'import',
    workflowable: {
      connection: connections().find((c) => c.slug === 'hr-spreadsheet')!,
      repository: repositories(true).find(
        (a) => a.slug === 'management-data-from-excel'
      ),
      path: '/',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    owner: workspaceUsers()[3],
    description:
      'This is an example Action Workflow for querying top 100 ad clicking users.',
    documentation: '# Hello World! \n This is a test documentation.',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    workflowable_type: 'action',
    workflowable: {
      path: '/find-top-100-ad-clicking-users.sql',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];

/**
 * Get example Import Workflow
 *
 * Type: {@link ImportWorkflow}
 */
export const imports = () =>
  workflows().filter(
    (a) => a.workflowable_type === 'import'
  ) as ImportWorkflow[];

/**
 * Get example Export Workflow
 *
 * Type: {@link ExportWorkflow}
 */
export const exports = () =>
  workflows().filter(
    (a) => a.workflowable_type === 'export'
  ) as ExportWorkflow[];

/**
 * Get example Action Workflow
 *
 * Type: {@link ActionWorkflow}
 */
export const actions = () =>
  workflows().filter(
    (a) => a.workflowable_type === 'action'
  ) as ActionWorkflow[];
