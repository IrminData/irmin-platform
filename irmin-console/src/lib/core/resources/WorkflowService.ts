import IrminCore from '@/lib/core';

import createWorkflowableFormData from '@/utils/createWorkflowableFormData';
import createWorkflowScheduleFormData from '@/utils/createWorkflowScheduleFormData';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { WorkflowSchedule } from '@/types/core/Schedule';
import { Workflow, WorkflowableType } from '@/types/core/Workflow';
import { WorkflowableInput } from '@/types/internal/WorkflowInput';

/**
 * Workflow API service
 *
 * Responsible for all workflow related API calls.
 */
class WorkflowService {
  private irminCore: IrminCore;

  /**
   * Create a new WorkflowService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkflows = this.fetchWorkflows.bind(this);
    this.fetchWorkflowsOfType = this.fetchWorkflowsOfType.bind(this);
    this.fetchWorkflow = this.fetchWorkflow.bind(this);
    this.createWorkflow = this.createWorkflow.bind(this);
    this.updateWorkflow = this.updateWorkflow.bind(this);
    this.updateWorkflowWorkflowable =
      this.updateWorkflowWorkflowable.bind(this);
    this.updateWorkflowSchedule = this.updateWorkflowSchedule.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.transferWorkflow = this.transferWorkflow.bind(this);
    this.pauseWorkflow = this.pauseWorkflow.bind(this);
    this.startWorflow = this.startWorflow.bind(this);
  }

  /**
   * List all workflows in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of Workflow.
   */
  async fetchWorkflows({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Workflow[]>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Workflow[]>;
    } catch (error) {
      console.error((error as Error).message, 'List workflows error');
      throw error;
    }
  }

  /**
   * List workflows of a specific type in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowType - The workflow type.
   * @returns IrminAPIResponse containing an array of Workflow.
   */
  async fetchWorkflowsOfType({
    workspace,
    workflowType,
  }: {
    workspace: string;
    workflowType: WorkflowableType;
  }): Promise<IrminAPIResponse<Workflow[]>> {
    try {
      const url = `/v1/workspaces/${workspace}/workflows?type=${encodeURIComponent(workflowType)}`;
      const response = await this.irminCore.fetchAPI(url, { method: 'GET' });
      return response as IrminAPIResponse<Workflow[]>;
    } catch (error) {
      console.error((error as Error).message, 'List workflows of type error');
      throw error;
    }
  }

  /**
   * Get a workflow by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the Workflow.
   */
  async fetchWorkflow({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Get workflow error');
      throw error;
    }
  }

  /**
   * Create a new workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.name - The workflow name.
   * @param props.description - The workflow description.
   * @param props.documentation - The workflow documentation.
   * @param props.workflowable - The workflowable data.
   * @param props.schedule - The workflow schedule.
   * @returns IrminAPIResponse containing the created Workflow.
   */
  async createWorkflow({
    workspace,
    name,
    description,
    documentation,
    workflowable,
    schedule,
  }: {
    workspace: string;
    name: string;
    description: string;
    documentation: string;
    workflowable: WorkflowableInput;
    schedule: WorkflowSchedule;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const params = new URLSearchParams();
      params.append('name', name);
      params.append('description', description);
      params.append('documentation', documentation);
      // Append workflowable data using helper function
      const workflowableFormData = createWorkflowableFormData(workflowable);
      for (const [key, value] of workflowableFormData.entries()) {
        params.append(key, String(value));
      }
      // Append schedule data using helper function
      const scheduleFormData = createWorkflowScheduleFormData(schedule);
      for (const [key, value] of scheduleFormData.entries()) {
        params.append(key, String(value));
      }
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Create workflow error');
      throw error;
    }
  }

  /**
   * Update a workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.name - The new workflow name.
   * @param props.description - The new workflow description.
   * @param props.documentation - The new workflow documentation.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async updateWorkflow({
    workspace,
    workflowID,
    name,
    description,
    documentation,
  }: {
    workspace: string;
    workflowID: string;
    name?: string;
    description?: string;
    documentation?: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (description) params.append('description', description);
      if (documentation) params.append('documentation', documentation);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Update workflow error');
      throw error;
    }
  }

  /**
   * Update a workflow's workflowable data.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.workflowable - The new workflowable data.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async updateWorkflowWorkflowable({
    workspace,
    workflowID,
    workflowable,
  }: {
    workspace: string;
    workflowID: string;
    workflowable: WorkflowableInput;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const workflowableFormData = createWorkflowableFormData(workflowable);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/workflowable`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: workflowableFormData,
        }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update workflow workflowable error'
      );
      throw error;
    }
  }

  /**
   * Update a workflow's schedule.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.schedule - The new schedule.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async updateWorkflowSchedule({
    workspace,
    workflowID,
    schedule,
  }: {
    workspace: string;
    workflowID: string;
    schedule: WorkflowSchedule;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const scheduleFormData = createWorkflowScheduleFormData(schedule);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/schedule`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: scheduleFormData,
        }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Update workflow schedule error');
      throw error;
    }
  }

  /**
   * Delete a workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the deletion result.
   */
  async deleteWorkflow({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete workflow error');
      throw error;
    }
  }

  /**
   * Transfer ownership of a workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @param props.newOwnerID - The new owner's ID.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async transferWorkflow({
    workspace,
    workflowID,
    newOwnerID,
  }: {
    workspace: string;
    workflowID: string;
    newOwnerID: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const params = new URLSearchParams();
      params.append('new_owner_id', newOwnerID);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Workflow ownership transfer error'
      );
      throw error;
    }
  }

  /**
   * Pause a workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async pauseWorkflow({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/pause`,
        { method: 'POST' }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Pause workflow error');
      throw error;
    }
  }

  /**
   * Start a workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the updated Workflow.
   */
  async startWorflow({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}/start`,
        { method: 'POST' }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Start workflow error');
      throw error;
    }
  }
}

export default WorkflowService;
