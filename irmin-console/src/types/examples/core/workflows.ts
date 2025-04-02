import { getRandomArrayElement } from '@/utils/getRandomArrayElement';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  PipelineWorkflow,
  Workflow,
  WorkflowStatus,
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
      id: 'import-workflow-1',
      name: 'Main Google Analytics',
      owner: workspaceUsers()[0],
      description:
        'This an example Import Workflow for syncing Google Analytics data to a Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: WorkflowStatus.Running,
      type: 'import',
      workflowable: {
        connection: connections().find(
          (c) => c.name === 'Main Google Analytics'
        )!,
        connection_path: '/',
        repository: repositories().find(
          (a) => a.slug === 'main-google-analytics'
        )!,
        path: '/',
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
    {
      id: 'import-workflow-2',
      name: 'KPIs from Excel',
      owner: workspaceUsers()[0],
      description:
        'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
      documentation:
        '# Excel import explanation. \n Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
      status: WorkflowStatus.Running,
      type: 'import',
      workflowable: {
        connection: connections().find((c) => c.name === 'KPIs spreadsheet')!,
        connection_path: '/',
        repository: repositories().find((a) => a.slug === 'kpis-from-excel')!,
        branch: 'main',
        path: '/',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
    {
      id: 'import-workflow-3',
      name: 'Management data from Excel',
      owner: workspaceUsers()[3],
      description:
        'This an example Import Workflow for syncing an Excel Sheet to a Repository.',
      documentation:
        'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
      status: WorkflowStatus.Running,
      type: 'import',
      workflowable: {
        connection: connections().find((c) => c.name === 'HR spreadsheet')!,
        connection_path: '/',
        repository: repositories().find(
          (a) => a.slug === 'management-data-from-excel'
        )!,
        branch: 'main',
        path: '/',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
  ];
  const exampleExports: ExportWorkflow[] = [
    {
      id: 'export-workflow-1',
      name: 'Export KPIs to Google Sheets',
      owner: workspaceUsers()[1],
      description:
        'This an example Export Workflow for exporting a Repository to Google Sheets Import.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: WorkflowStatus.Running,
      type: 'export',
      workflowable: {
        connection: connections().find((c) => c.name === 'Google Sheets KPIs')!,
        connection_path: '/',
        repository: repositories().find((a) => a.slug === 'kpis-from-excel')!,
        path: '/',
        recursive: false,
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
  ];
  const exampleActions: ActionWorkflow[] = [
    {
      id: 'action-workflow-1',
      name: 'App usage data',
      owner: workspaceUsers()[2],
      description:
        'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: WorkflowStatus.Running,
      type: 'action',
      workflowable: {
        path: '/',
        executable: '/fetch-app-data.js',
        repository: repositories().find((a) => a.slug === 'app-data'),
        branch: 'main',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
    {
      id: 'action-workflow-2',
      name: 'Send receipt on order',
      owner: workspaceUsers()[0],
      description:
        'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: WorkflowStatus.Error,
      type: 'action',
      workflowable: {
        executable: '/send-receipt-on-order.js',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
    {
      id: 'action-workflow-3',
      name: 'Top 100 Ad Clicking Users',
      owner: workspaceUsers()[3],
      description:
        'This is an example Action Workflow for querying top 100 ad clicking users.',
      documentation: '# Hello World! \n This is a test documentation.',
      status: WorkflowStatus.Running,
      type: 'action',
      workflowable: {
        path: '/',
        branch: 'main',
        repository: repositories().find(
          (a) => a.slug === 'top-100-ad-clicking-users'
        ),
        executable: '/find-top-100-ad-clicking-users.sql',
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
  ];
  const examplePipelines: PipelineWorkflow[] = [
    {
      id: '1',
      name: 'Data Transformation Pipeline',
      owner: workspaceUsers()[1],
      description:
        'Processes raw data, applies transformations, and loads it into a warehouse.',
      documentation:
        '# Data Transformation Pipeline\nA three-step pipeline to process raw data and store it in the data warehouse.',
      status: WorkflowStatus.Running,
      type: 'pipeline',
      workflowable: {
        live: false,
        stages: [
          {
            description: 'Read raw data from Google Analytics',
            type: 'connection',
            connection: connections().find(
              (c) => c.name === 'Main Google Analytics'
            )!,
            connection_write_path: '/',
            connection_read_path: '/',
            write: false,
            read: true,
          },
          {
            description: 'Validate data and transform format',
            type: 'action',
            write: true,
            read: true,
            executable: '/path/to/script.js',
          },
          {
            description: 'Update KPIs in Google Sheets',
            type: 'connection',
            connection: connections().find(
              (c) => c.name === 'Google Sheets KPIs'
            )!,
            connection_write_path: '/analytics',
            connection_read_path: '/',
            write: true,
            read: false,
          },
          {
            description: 'Write transformed data to a repository',
            type: 'repository',
            write: true,
            read: false,
            repository: repositories().find(
              (a) => a.slug === 'main-google-analytics'
            )!,
            branch: 'ga-pipeline',
            path: '/',
          },
        ],
      },
      schedule: getRandomArrayElement(workflowSchedules),
    },
  ];
  return [
    ...exampleImports,
    ...exampleExports,
    ...exampleActions,
    ...examplePipelines,
  ];
};

/**
 * Get example Import Workflow
 *
 * Type: {@link ImportWorkflow}
 */
export const imports = () =>
  workflows().filter((a) => a.type === 'import') as ImportWorkflow[];

/**
 * Get example Export Workflow
 *
 * Type: {@link ExportWorkflow}
 */
export const exports = () =>
  workflows().filter((a) => a.type === 'export') as ExportWorkflow[];

/**
 * Get example Action Workflow
 *
 * Type: {@link ActionWorkflow}
 */
export const actions = () =>
  workflows().filter((a) => a.type === 'action') as ActionWorkflow[];

/**
 * Get example Pipeline Workflow
 *
 * Type: {@link PipelineWorkflow}
 */
export const pipelines = () =>
  workflows().filter((a) => a.type === 'pipeline') as PipelineWorkflow[];
