'use server';

import { initCore } from '@/lib/initCore';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowSchedule } from '@/types/core/Schedule';
import type { Workflow, WorkflowableType } from '@/types/core/Workflow';
import type { WorkflowableInput } from '@/types/internal/WorkflowInput';

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
 * Get workflows of a specific type in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowType - The workflow type.
 * @param props.token - Optional token for authentication.
 * @returns The list of workflows of the specified type.
 */
export async function getWorkflowsOfType({
  workspace,
  workflowType,
  token,
}: {
  workspace: string;
  workflowType: WorkflowableType;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow[]> =
    await irminCore.workflowService.fetchWorkflowsOfType({
      workspace,
      workflowType,
    });
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

/**
 * Create a new workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.name - The workflow name.
 * @param props.description - The workflow description.
 * @param props.documentation - The workflow documentation.
 * @param props.workflowable - The workflowable input data.
 * @param props.schedule - The workflow schedule.
 * @param props.token - Optional token for authentication.
 * @returns The created workflow.
 */
export async function createWorkflow({
  workspace,
  name,
  description,
  documentation,
  workflowable,
  schedule,
  token,
}: {
  workspace: string;
  name: string;
  description: string;
  documentation: string;
  workflowable: WorkflowableInput;
  schedule: WorkflowSchedule;
  token?: string;
}) {
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
  return res;
}

/**
 * Update a workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.name - The new workflow name.
 * @param props.description - The new workflow description.
 * @param props.documentation - The new workflow documentation.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflow({
  workspace,
  workflowID,
  name,
  description,
  documentation,
  token,
}: {
  workspace: string;
  workflowID: string;
  name?: string;
  description?: string;
  documentation?: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflow({
      workspace,
      workflowID,
      name,
      description,
      documentation,
    });
  return res;
}

/**
 * Update a workflow's workflowable data.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.workflowable - The new workflowable input data.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflowWorkflowable({
  workspace,
  workflowID,
  workflowable,
  token,
}: {
  workspace: string;
  workflowID: string;
  workflowable: WorkflowableInput;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflowWorkflowable({
      workspace,
      workflowID,
      workflowable,
    });
  return res;
}

/**
 * Update a workflow's schedule.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.schedule - The new workflow schedule.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow.
 */
export async function updateWorkflowSchedule({
  workspace,
  workflowID,
  schedule,
  token,
}: {
  workspace: string;
  workflowID: string;
  schedule: WorkflowSchedule;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.updateWorkflowSchedule({
      workspace,
      workflowID,
      schedule,
    });
  return res;
}

/**
 * Delete a workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The deletion result.
 */
export async function deleteWorkflow({
  workspace,
  workflowID,
  token,
}: {
  workspace: string;
  workflowID: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.newOwnerID - The new owner's ID.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow with new ownership.
 */
export async function transferWorkflow({
  workspace,
  workflowID,
  newOwnerID,
  token,
}: {
  workspace: string;
  workflowID: string;
  newOwnerID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res: IrminAPIResponse<Workflow> =
    await irminCore.workflowService.transferWorkflow({
      workspace,
      workflowID,
      newOwnerID,
    });
  return res;
}

/**
 * Pause a workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow with paused status.
 */
export async function pauseWorkflow({
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
    await irminCore.workflowService.pauseWorkflow({
      workspace,
      workflowID,
    });
  return res;
}

/**
 * Start a workflow.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.workflowID - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The updated workflow with resumed status.
 */
export async function startWorkflow({
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
    await irminCore.workflowService.startWorflow({
      workspace,
      workflowID,
    });
  return res;
}
