import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { LogEvent, LogEventType, WorkflowRunLogs } from '@/types/core/Log';

import {
  exampleConnections,
  exampleRepositories,
  exampleWorkflowRuns,
  exampleWorkflows,
} from '.';
import { workspaceUsers } from './users';

/**
 * Example log events for testing
 * {@link LogEvent}
 */
export const logEvents: () => LogEvent[] = () => [
  {
    id: '1',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Created a new workflow.',
    user: workspaceUsers()[0],
  },
  {
    id: '2',
    type: LogEventType.UPDATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Workflow ran successfuly.',
    user: workspaceUsers()[0],
  },
  {
    id: '3',
    type: LogEventType.ERROR,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Error occurred during workflow run.',
    user: workspaceUsers()[1],
  },
  {
    id: '4',
    type: LogEventType.WARNING,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Warning: Low disk space on the server.',
  },
  {
    id: '5',
    type: LogEventType.LOGIN,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'User logged in successfully.',
    user: workspaceUsers()[2],
  },
  {
    id: '6',
    type: LogEventType.LOGOUT,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'User logged out.',
    user: workspaceUsers()[1],
  },
  {
    id: '7',
    type: LogEventType.DELETE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Deleted the document "Q1 Sales Report".',
  },
  {
    id: '8',
    type: LogEventType.UPDATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Updated workflow.',
    user: workspaceUsers()[1],
  },
  {
    id: '9',
    type: LogEventType.ERROR,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Error occurred during the backup process.',
  },
  {
    id: '10',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Created a new folder "Accounting Reports".',
    user: workspaceUsers()[3],
  },
  {
    id: '11',
    type: LogEventType.WARNING,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Warning: High memory usage detected.',
  },
  {
    id: '12',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Invited new user.',
    user: workspaceUsers()[0],
  },
];

/**
 * Example workflow log events for testing
 */
export const workflowLogEvents = (): LogEvent[] =>
  logEvents().map((event) => ({
    ...event,
    subject_id: exampleWorkflows[0].id,
    subject_type: 'workflow',
  }));

/**
 * Example repository log events for testing
 */
export const repositoryLogEvents = (): LogEvent[] =>
  logEvents().map((event) => ({
    ...event,
    subject_id: exampleRepositories[0].id,
    subject_type: 'repository',
  }));

/**
 * Example connection log events for testing
 */
export const connectionLogEvents = (): LogEvent[] =>
  logEvents().map((event) => ({
    ...event,
    subject_id: exampleConnections[0].id,
    subject_type: 'connection',
  }));

/**
 * Example workflow run logs for testing
 * {@link WorkflowRunLogs}
 */
export const workflowRunLogs: () => WorkflowRunLogs = () => ({
  workflow: exampleWorkflows[0],
  workflowRun: exampleWorkflowRuns[0],
  logs: [
    '2024-10-05 10:00:01 [INFO] Starting workflow: FormatDataForWooCommerce',
    '2024-10-05 10:00:02 [INFO] Fetching data from Microsoft Dynamics...',
    '2024-10-05 10:00:05 [ERROR] Failed to fetch data: Timeout occurred while connecting to Microsoft Dynamics API.',
    '2024-10-05 10:00:06 [INFO] Retrying data fetch... Attempt 1',
    '2024-10-05 10:00:08 [INFO] Data fetched successfully: 500 records retrieved.',
    '2024-10-05 10:00:09 [INFO] Formatting data for WooCommerce...',
    "2024-10-05 10:00:10 [ERROR] Data formatting error: Missing required field 'product_id' in record with index 42.",
    "2024-10-05 10:00:11 [ERROR] Data formatting error: Invalid price format in record with index 78. Expected a number but received 'twenty-five'.",
    '2024-10-05 10:00:12 [INFO] Continuing with remaining records despite errors. Total valid records: 498.',
    '2024-10-05 10:00:15 [INFO] Preparing to send formatted data to WooCommerce...',
    '2024-10-05 10:00:16 [ERROR] API call to WooCommerce failed: 401 Unauthorized. Invalid API key.',
    '2024-10-05 10:00:17 [INFO] Retrying API call to WooCommerce... Attempt 1',
    '2024-10-05 10:00:19 [INFO] Data sent to WooCommerce successfully: 498 records uploaded.',
    '2024-10-05 10:00:20 [INFO] Workflow completed: FormatDataForWooCommerce. Total processed records: 500.',
    '2024-10-05 10:00:21 [WARNING] 2 records had formatting issues and were not uploaded.',
    '2024-10-05 10:00:22 [INFO] Error report generated: Check log file for details.',
    '2024-10-05 10:00:23 [INFO] Workflow run finished.',
  ],
});
