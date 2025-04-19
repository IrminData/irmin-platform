'use server';

import { initCore } from '@/lib/initCore';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workflow } from '@/types/core/Workflow';

/**
 * Get all workflows in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The list of workflows.
 */
export async function getWorkflows({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow[]> =
    await irminCore.workflowService.fetchWorkflows({ workspace });
  return res;
}

/**
 * Get a workflow by its ID.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The workflow details.
 */
export async function getWorkflow({
  workspace,
  workflowID,
  token,
}: {
  workspace: string;
  workflowID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.fetchWorkflow({ workspace, workflowID });
  return res;
}
