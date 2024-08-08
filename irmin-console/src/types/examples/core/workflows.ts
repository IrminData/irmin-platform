import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
} from '@/types/api/Workflow';

import { connectors } from './connectors';
import { repositories } from './repositories';
import { workspaceUsers } from './users';

/**
 * Get example Google Sheets KPIs Connection Workflow
 */
const googleSheetsKPIsConnection = (last = false): ConnectionWorkflow => ({
  id: 6,
  name: 'Google Sheets KPIs',
  slug: 'google-sheets-kpis',
  owner: workspaceUsers()[0],
  description:
    'This an example Connection Workflow for syncing KPIs from Google Sheets',
  documentation:
    'This workflow is not scheduled and should be ran manually when needed. It is used as the destination for the Export Workflow example.',
  cron_syntax: null,
  last_run_at: getRandomDateTimeString(10, 'past', 2),
  next_run_at: null,
  status: 'paused',
  repository: !last ? repositories(true)[5] : undefined,
  workflowable_type: 'connection',
  workflowable: {
    details: "{googleApiKey:'pk-123123',username:'admin'}",
    settings: "{path:'/business/financials/KPIs.xlsx'}",
    connector: connectors()[4],
  },
  created_at: getRandomDateTimeString(500, 'past', 60),
  updated_at: getRandomDateTimeString(50, 'past', 10),
});

/**
 * Get example Workflows
 *
 * Array of {@link Workflow}
 *
 * @param last - If true, the items will avoid having children
 */
export const workflows = (last = false): Workflow[] => [
  {
    id: 0,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection Workflow for syncing Google Analytics data to a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: !last ? repositories(true)[1] : undefined,
    workflowable_type: 'connection',
    workflowable: {
      details: "{googleApiKey:'pk-13123123',username:'admin'}",
      settings: "{views:'sessions,users,pageviews,events'}",
      connector: connectors()[5],
    },
  },
  {
    id: 1,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    owner: workspaceUsers()[1],
    description:
      'This an example Export Workflow for exporting a Repository to Google Sheets Connection.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: !last ? repositories(true)[6] : undefined,
    workflowable_type: 'export',
    workflowable: {
      destination: googleSheetsKPIsConnection(true),
      source: repositories(true)[0],
    },
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    owner: workspaceUsers()[2],
    description:
      'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: !last ? repositories(true)[2] : undefined,
    workflowable_type: 'action',
    workflowable: {
      path: '/fetch-app-usage-data.js',
    },
  },
  {
    id: 3,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    owner: workspaceUsers()[0],
    description:
      'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'error',
    repository: !last ? repositories(true)[7] : undefined,
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
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(40, 'past', 10),
    next_run_at: null,
    status: 'running',
    repository: !last ? repositories(true)[4] : undefined,
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'kpis.xlsx'}",
      settings: '{}',
      connector: connectors()[6],
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
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    repository: !last ? repositories(true)[4] : undefined,
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'management-and-hr.xlsx'}",
      settings: '{}',
      connector: connectors()[6],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  googleSheetsKPIsConnection(),
  {
    id: 7,
    name: 'Top 100 Ad Clicking Users',
    slug: 'top-100-ad-clicking-users',
    owner: workspaceUsers()[3],
    description:
      'This is an example Action Workflow for querying top 100 ad clicking users.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    repository: !last ? repositories(true)[8] : undefined,
    workflowable_type: 'action',
    workflowable: {
      path: '/find-top-100-ad-clicking-users.sql',
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];

/**
 * Get example Connection Workflow
 *
 * Type: {@link ConnectionWorkflow}
 */
export const connections = () =>
  workflows().filter(
    (a) => a.workflowable_type === 'connection'
  ) as ConnectionWorkflow[];

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
