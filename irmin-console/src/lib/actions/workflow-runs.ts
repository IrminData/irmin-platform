'use server';

import { initCore } from '@/lib/initCore';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

/**
 * Get all workflow runs for a given workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of workflow runs.
 */
export async function getWorkflowRuns({
  workspace,
  workflowID,
  token,
}: {
  workspace: string;
  workflowID: string;
  token?: string;
}): Promise<IrminAPIResponse<WorkflowRun[]>> {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.runID - The run identifier.
 * @param props.token - Optional token for authentication.
 * @returns The workflow run details.
 */
export async function getWorkflowRun({
  workspace,
  workflowID,
  runID,
  token,
}: {
  workspace: string;
  workflowID: string;
  runID: string;
  token?: string;
}): Promise<IrminAPIResponse<WorkflowRun>> {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<WorkflowRun> =
    await irminCore.workflowRunService.fetchWorkflowRun({
      workspace,
      workflowID,
      runID,
    });
  return res;
}
