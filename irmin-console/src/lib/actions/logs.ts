'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of logs for a workflow or the workspace.
 *
 * @returns List of log events
 */
export async function getLogs(workflowID?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the logs
  const logs = await irminCore.logService.fetchLogEvents(workflowID);
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
