'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of logs for the workspace.
 *
 * @returns List of log events
 */
export async function getLogs() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchLogEvents();
  return logs.data;
}

/**
 * Server action to get the list of logs for a workflow
 */
export async function getWorkflowLogs(workflowID: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchWorkflowLogEvents(workflowID);
  return logs.data;
}

/**
 * Server action to get the list of logs for a repository
 */
export async function getRepositoryLogs(repositorySlug: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchRepositoryLogs(repositorySlug);
  return logs.data;
}

/**
 * Server action to get the list of logs for a connection
 */
export async function getConnectionLogs(connectionID: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchConnectionLogs(connectionID);
  return logs.data;
}

/**
 * Server action to get the list of logs for a workflow run
 *
 * @returns List of logs
 */
export async function getWorkflowRunLogs(
  workflowID: string,
  workflowRunID: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchWorkflowRunLogs(
    workflowID,
    workflowRunID
  );
  return logs.data;
}
