'use server';

import { initCore } from '@/lib/initCore';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowSchedule } from '@/types/core/Schedule';
import type { Workflow } from '@/types/core/Workflow';
import type { WorkflowableInput } from '@/types/internal/WorkflowInput';

/**
 * Get all workflows in a workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional token for authentication.
 * @returns The list of workflows.
 */
export async function getWorkflows(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow[]> =
    await irminCore.workflowService.fetchWorkflows({ workspace });
  return res.data;
}

/**
 * Get workflows of a specific type in a workspace.
 *
 * @param workspace - The workspace slug.
 * @param workflowType - The workflow type.
 * @param token - Optional token for authentication.
 * @returns The list of workflows of the specified type.
 */
export async function getWorkflowsOfType(
  workspace: string,
  workflowType: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow[]> =
    await irminCore.workflowService.fetchWorkflowsOfType({
      workspace,
      workflowType,
    });
  return res.data;
}

/**
 * Get a workflow by its ID.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param token - Optional token for authentication.
 * @returns The workflow details.
 */
export async function getWorkflow(
  workspace: string,
  workflowID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.fetchWorkflow({ workspace, workflowID });
  return res.data;
}

/**
 * Create a new workflow.
 *
 * @param workspace - The workspace slug.
 * @param name - The workflow name.
 * @param description - The workflow description.
 * @param documentation - The workflow documentation.
 * @param workflowable - The workflowable input data.
 * @param schedule - The workflow schedule.
 * @param token - Optional token for authentication.
 * @returns The created workflow.
 */
export async function createWorkflow(
  workspace: string,
  name: string,
  description: string,
  documentation: string,
  workflowable: WorkflowableInput,
  schedule: WorkflowSchedule,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.createWorkflow({
      workspace,
      name,
      description,
      documentation,
      workflowable,
      schedule,
    });
  return res.data;
}

/**
 * Update a workflow.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param name - The new workflow name.
 * @param description - The new workflow description.
 * @param documentation - The new workflow documentation.
 * @param token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflow(
  workspace: string,
  workflowID: string,
  name: string,
  description: string,
  documentation: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflow({
      workspace,
      workflowID,
      name,
      description,
      documentation,
    });
  return res.data;
}

/**
 * Update a workflow's workflowable data.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param workflowable - The new workflowable input data.
 * @param token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflowWorkflowable(
  workspace: string,
  workflowID: string,
  workflowable: WorkflowableInput,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflowWorkflowable({
      workspace,
      workflowID,
      workflowable,
    });
  return res.data;
}

/**
 * Update a workflow's schedule.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param schedule - The new workflow schedule.
 * @param token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflowSchedule(
  workspace: string,
  workflowID: string,
  schedule: WorkflowSchedule,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflowSchedule({
      workspace,
      workflowID,
      schedule,
    });
  return res.data;
}

/**
 * Delete a workflow.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param token - Optional token for authentication.
 * @returns The deletion result.
 */
export async function deleteWorkflow(
  workspace: string,
  workflowID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workflowService.deleteWorkflow({
    workspace,
    workflowID,
  });
  return res;
}

/**
 * Transfer a workflow to a new owner.
 *
 * @param workspace - The workspace slug.
 * @param workflowID - The workflow identifier.
 * @param newOwnerID - The new owner's ID.
 * @param token - Optional token for authentication.
 * @returns The updated workflow with new ownership.
 */
export async function transferWorkflow(
  workspace: string,
  workflowID: string,
  newOwnerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.transferWorkflow({
      workspace,
      workflowID,
      newOwnerID,
    });
  return res.data;
}
