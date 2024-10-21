'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a workflow runs for a workflow
 */
export async function getWorkflowRuns(workflow: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the runs
  const runs = await irminCore.workflowService.fetchRunsByWorkflow(workflow);
  return runs.data;
}

/**
 * Server action to get a workflow run by ID.
 */
export async function getWorkflowRun(workflow: string, runID: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the run
  const run = await irminCore.workflowService.fetchWorkflowRunByID(
    workflow,
    runID
  );
  return run.data;
}
