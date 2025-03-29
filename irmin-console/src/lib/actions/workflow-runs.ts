'use server';

import { initCore } from '@/lib/initCore';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

/**
 * Get all workflow runs for a given workflow.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param token - Optional token for authentication.
 * @returns The list of workflow runs.
 */
export async function getWorkflowRuns(
  workspace: string,
  workflowID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<WorkflowRun[]> =
    await irminCore.workflowRunService.fetchWorkflowRuns({
      workspace,
      workflowID,
    });
  return res;
}

/**
 * Get a single workflow run by its ID.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param runID - The run identifier.
 * @param token - Optional token for authentication.
 * @returns The workflow run details.
 */
export async function getWorkflowRun(
  workspace: string,
  workflowID: string,
  runID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<WorkflowRun> =
    await irminCore.workflowRunService.fetchWorkflowRun({
      workspace,
      workflowID,
      runID,
    });
  return res;
}

/**
 * Cancel a workflow run.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param runID - The run identifier.
 * @param token - Optional token for authentication.
 * @returns The cancelled workflow run.
 */
export async function cancelWorkflowRun(
  workspace: string,
  workflowID: string,
  runID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<WorkflowRun> =
    await irminCore.workflowRunService.cancelWorkflowRun({
      workspace,
      workflowID,
      runID,
    });
  return res;
}

/**
 * Trigger a new workflow run.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param token - Optional token for authentication.
 * @returns The newly triggered workflow run.
 */
export async function triggerWorkflowRun(
  workspace: string,
  workflowID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<WorkflowRun> =
    await irminCore.workflowRunService.triggerWorkflowRun({
      workspace,
      workflowID,
    });
  return res;
}
