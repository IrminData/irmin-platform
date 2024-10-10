import { getRandomArrayElement } from '@/utils/getRandomArrayElement';
import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
} from '@/types/core/Workflow';

import { connections } from './connections';
import { repositories } from './repositories';
import { workflowSchedules } from './schedules';
import { workspaceUsers } from './users';

/**
 * Get example Workflows
 *
 * Array of {@link Workflow}
 */
export const workflows = (): Workflow[] => {
  const exampleImports: ImportWorkflow[] = [
    {
      id: '0',
      name: 'Main Google Analytics',
      owner: workspaceUsers()[0],
      description:
        'This an example Import Workflow for syncing Google Analytics data to a Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: 'running',
      workflowable_type: 'import',
      workflowable: {
        connection: connections().find(
          (c) => c.name === 'Main Google Analytics'
        )!,
        repository: repositories().find(
          (a) => a.slug === 'main-google-analytics'
        )!,
        path: '/',
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
    {
      id: '4',
      name: 'KPIs from Excel',
      owner: workspaceUsers()[0],
      description:
        'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
      documentation:
        '# Excel import explanation. \n Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
      status: 'running',
      workflowable_type: 'import',
      workflowable: {
        connection: connections().find((c) => c.name === 'KPIs spreadsheet')!,
        repository: repositories().find((a) => a.slug === 'kpis-from-excel')!,
        branch: 'main',
        path: '/',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
    {
      id: '5',
      name: 'Management data from Excel',
      owner: workspaceUsers()[3],
      description:
        'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
      documentation:
        'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
      status: 'running',
      workflowable_type: 'import',
      workflowable: {
        connection: connections().find((c) => c.name === 'HR spreadsheet')!,
        repository: repositories().find(
          (a) => a.slug === 'management-data-from-excel'
        )!,
        branch: 'main',
        path: '/',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
  ];
  const exampleExports: ExportWorkflow[] = [
    {
      id: '1',
      name: 'Export KPIs to Google Sheets',
      owner: workspaceUsers()[1],
      description:
        'This an example Export Workflow for exporting a Repository to Google Sheets Import.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: 'running',
      workflowable_type: 'export',
      workflowable: {
        connection: connections().find((c) => c.name === 'Google Sheets KPIs')!,
        repository: repositories().find(
          (a) => a.slug === 'kpi-and-performance-metrics'
        )!,
        path: '/',
        recursive: false,
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
  ];
  const exampleActions: ActionWorkflow[] = [
    {
      id: '2',
      name: 'App usage data',
      owner: workspaceUsers()[2],
      description:
        'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: 'running',
      workflowable_type: 'action',
      workflowable: {
        path: '/',
        executable: '/fetch-app-data.js',
        repository: repositories().find((a) => a.slug === 'app-data'),
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
    {
      id: '3',
      name: 'Send receipt on order',
      owner: workspaceUsers()[0],
      description:
        'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: 'error',
      workflowable_type: 'action',
      workflowable: {
        executable: '/send-receipt-on-order.js',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
    {
      id: '6',
      name: 'Top 100 Ad Clicking Users',
      owner: workspaceUsers()[3],
      description:
        'This is an example Action Workflow for querying top 100 ad clicking users.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: 'running',
      workflowable_type: 'action',
      workflowable: {
        path: '/',
        branch: 'main',
        repository: repositories().find(
          (a) => a.slug === 'top-100-ad-clicking-users'
        ),
        executable: '/find-top-100-ad-clicking-users.sql',
      },
      schedule: getRandomArrayElement(workflowSchedules),
      created_at: getRandomDateTimeString(500, 'past', 60),
      updated_at: getRandomDateTimeString(50, 'past', 10),
    },
  ];
  return [...exampleImports, ...exampleExports, ...exampleActions];
};

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
