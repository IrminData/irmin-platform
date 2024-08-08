import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
} from '@/types/api/Workflow';

import {
  exampleConnectors,
  exampleRepositories,
  exampleWorkspaceUsers,
} from '.';

/**
 * Example Workflows
 *
 * Array of {@link Workflow}
 */
export const workflows: Workflow[] = [
  {
    id: 0,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing Google Analytics data to a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[1],
    workflowable_type: 'connection',
    workflowable: {
      details: "{googleApiKey:'pk-13123123',username:'admin'}",
      settings: "{views:'sessions,users,pageviews,events'}",
      connector: exampleConnectors[5],
    },
  },
  {
    id: 1,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    owner: exampleWorkspaceUsers[1],
    description:
      'This an example Export Workflow for exporting a Repository to Google Sheets Connection.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[6],
    workflowable_type: 'export',
    workflowable: {
      destination: {} as ConnectionWorkflow, // This is assigned later
      source: exampleRepositories[0],
    },
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    owner: exampleWorkspaceUsers[2],
    description:
      'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[2],
    workflowable_type: 'action',
    workflowable: {
      path: '/fetch-app-usage-data.js',
    },
  },
  {
    id: 3,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'error',
    repository: exampleRepositories[7],
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
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(40, 'past', 10),
    next_run_at: null,
    status: 'running',
    repository: exampleRepositories[4],
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'kpis.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    owner: exampleWorkspaceUsers[3],
    description:
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    repository: exampleRepositories[4],
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'management-and-hr.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing KPIs from Google Sheets',
    documentation:
      'This workflow is not scheduled and should be ran manually when needed. It is used as the destination for the Export Workflow example.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(10, 'past', 2),
    next_run_at: null,
    status: 'paused',
    repository: exampleRepositories[5],
    workflowable_type: 'connection',
    workflowable: {
      details: "{googleApiKey:'pk-123123',username:'admin'}",
      settings: "{path:'/business/financials/KPIs.xlsx'}",
      connector: exampleConnectors[4],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 7,
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    owner: exampleWorkspaceUsers[3],
    description:
      'This is an example Action Workflow for querying top 100 ad clicking users.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    repository: exampleRepositories[8],
    workflowable_type: 'action',
    workflowable: {
      path: '/find-top-100-ad-clicking-users.sql',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
(workflows[1] as ExportWorkflow).workflowable.destination =
  workflows[6] as ConnectionWorkflow; // Set destination to Export Workflow, handled here due to circular dependency

/**
 * Example Connection Workflow
 *
 * Type: {@link ConnectionWorkflow}
 */
export const exampleConnections = workflows.filter(
  (a) => a.workflowable_type === 'connection'
) as ConnectionWorkflow[];

/**
 * Example Export Workflow
 *
 * Type: {@link ExportWorkflow}
 */
export const exampleExports = workflows.filter(
  (a) => a.workflowable_type === 'export'
) as ExportWorkflow[];

/**
 * Example Action Workflow
 *
 * Type: {@link ActionWorkflow}
 */
export const exampleActions = workflows.filter(
  (a) => a.workflowable_type === 'action'
) as ActionWorkflow[];
