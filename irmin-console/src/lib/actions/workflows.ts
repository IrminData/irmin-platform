'use server';

import { initCore } from '@/lib/initCore';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
} from '@/types/core/Workflow';
import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get all workflows for the current workspace.
 */
export async function getWorkflows() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the workflows
  const workflows = await irminCore.workflowService.fetchWorkflows();
  return workflows.data;
}

/**
 * Server action to get all action workflows for the current workspace.
 */
export async function getActionWorkflows() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the workflows
  const workflows = await irminCore.workflowService.fetchActionWorkflows();
  return workflows.data;
}

/**
 * Server action to get all export workflows for the current workspace.
 */
export async function getExportWorkflows() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the workflows
  const workflows = await irminCore.workflowService.fetchExportWorkflows();
  return workflows.data;
}

/**
 * Server action to get all import workflows for the current workspace.
 */
export async function getImportWorkflows() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the workflows
  const workflows = await irminCore.workflowService.fetchImportWorkflows();
  return workflows.data;
}

/**
 * Server action to fetch a single workflow by ID.
 */
export async function getWorkflow(workflowID: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Fetch the workflow
  const workflow = await irminCore.workflowService.fetchWorkflow(workflowID);
  const foundWorkflow = workflow.data;

  // Return the workflow based on its type
  if (foundWorkflow.workflowable_type === 'import')
    return foundWorkflow as ImportWorkflow;
  if (foundWorkflow.workflowable_type === 'export')
    return foundWorkflow as ExportWorkflow;
  if (foundWorkflow.workflowable_type === 'action')
    return foundWorkflow as ActionWorkflow;

  throw new Error('Invalid workflow type');
}

/**
 * Server action to update a workflow.
 */
export async function updateWorkflow(
  workflowID: string,
  data: ItemUpdateProps
) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.updateWorkflow(workflowID, data);
  return res;
}

/**
 * Server action to delete a workflow.
 */
export async function deleteWorkflow(workflowID: string) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.deleteWorkflow(workflowID);
  return res;
}

/**
 * Server action to reassign a workflow.
 */
export async function reassignWorkflow(workflowID: string, ownerID: string) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.reassignWorkflow(
    workflowID,
    ownerID
  );
  return res;
}

/**
 * Server action to pause a workflow.
 */
export async function pauseWorkflow(workflowID: string) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.pauseWorkflow(workflowID);
  return res;
}

/**
 * Server action to resume a workflow.
 */
export async function resumeWorkflow(workflowID: string) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.resumeWorkflow(workflowID);
  return res;
}

/**
 * Server action to trigger a workflow run.
 */
export async function triggerWorkflowRun(workflowID: string) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.triggerWorkflowRun(workflowID);
  return res;
}

/**
 * Server action to get a workflow runs for a workflow
 */
export async function getWorkflowRuns(workflow: string) {
  const irminCore = await initCore();
  const runs = await irminCore.workflowService.fetchRunsByWorkflow(workflow);
  return runs.data;
}

/**
 * Server action to get a workflow run by ID.
 */
export async function getWorkflowRun(workflow: string, runID: string) {
  const irminCore = await initCore();
  const run = await irminCore.workflowService.fetchWorkflowRunByID(
    workflow,
    runID
  );
  return run.data;
}

/**
 * Server action to create an action workflow.
 */
export async function createActionWorkflow(data: {
  // Workflow data
  name: string;
  description: string;
  documentation: string;
  schedule: WorkflowSchedule;
  // Workflowable data
  executable: string;
  repository: string;
  branch: string;
  path: string;
}) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.createActionWorkflow(data);
  return res;
}

/**
 * Server action to create an import workflow.
 */
export async function createImportWorkflow(data: {
  // Workflow data
  name: string;
  description: string;
  documentation: string;
  schedule: WorkflowSchedule;
  // Workflowable data
  repository: string;
  branch: string;
  path: string;
  connection: string;
}) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.createImportWorkflow(data);
  return res;
}

/**
 * Server action to create an export workflow.
 */
export async function createExportWorkflow(data: {
  // Workflow data
  name: string;
  description: string;
  documentation: string;
  schedule: WorkflowSchedule;
  // Workflowable data
  repository: string;
  branch: string;
  path: string;
  connection: string;
  recursive: boolean;
}) {
  const irminCore = await initCore();
  const res = await irminCore.workflowService.createExportWorkflow(data);
  return res;
}
