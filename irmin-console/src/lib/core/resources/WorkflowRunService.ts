import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

/**
 * Workflow Run API service
 *
 * Responsible for all workflow run related API calls.
 */
class WorkflowRunService {
  private irminCore: IrminCore;

  /**
   * Create a new WorkflowRunService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkflowRuns = this.fetchWorkflowRuns.bind(this);
    this.fetchWorkflowRun = this.fetchWorkflowRun.bind(this);
    this.cancelWorkflowRun = this.cancelWorkflowRun.bind(this);
    this.triggerWorkflowRun = this.triggerWorkflowRun.bind(this);
  }

  /**
   * List all workflow runs for a given workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   * @returns IrminAPIResponse containing an array of WorkflowRun.
   */
  async fetchWorkflowRuns({
    workspace,
    workflowID,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    workflowID: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<WorkflowRun[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/runs?per_page=${perPage}&page=${page}`,
        { method: 'GET' }
      )) as IrminAPIResponse<WorkflowRun[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflow runs error');
      throw error;
    }
  }

  /**
   * Get a specific workflow run by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.runID - The run identifier.
   * @returns IrminAPIResponse containing the WorkflowRun.
   */
  async fetchWorkflowRun({
    workspace,
    workflowID,
    runID,
  }: {
    workspace: string;
    workflowID: string;
    runID: string;
  }): Promise<IrminAPIResponse<WorkflowRun>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/runs/${runID}`,
        { method: 'GET' }
      )) as IrminAPIResponse<WorkflowRun>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflow run error');
      throw error;
    }
  }

  /**
   * Cancel a workflow run.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.runID - The run identifier.
   * @returns IrminAPIResponse containing the canceled WorkflowRun.
   */
  async cancelWorkflowRun({
    workspace,
    workflowID,
    runID,
  }: {
    workspace: string;
    workflowID: string;
    runID: string;
  }): Promise<IrminAPIResponse<WorkflowRun>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/runs/${runID}`,
        { method: 'DELETE' }
      )) as IrminAPIResponse<WorkflowRun>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Cancel workflow run error');
      throw error;
    }
  }

  /**
   * Trigger a new workflow run.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the newly triggered WorkflowRun.
   */
  async triggerWorkflowRun({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse<WorkflowRun>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/runs`,
        { method: 'POST' }
      )) as IrminAPIResponse<WorkflowRun>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Trigger workflow run error');
      throw error;
    }
  }
}

export default WorkflowRunService;
