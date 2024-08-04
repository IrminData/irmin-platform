import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { WorkspaceUser } from '@/types/api/Workspace';
import {
  exampleActions,
  exampleAPIResponse,
  exampleConnections,
  exampleExports,
  exampleWorkflowRuns,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Workflow Runs API response type
 */
interface WorkflowRunsAPIResponse extends IrminAPIResponse {
  data: WorkflowRun[];
}
/**
 * Connection Workflows API response type
 */
interface ConnectionsAPIResponse extends IrminAPIResponse {
  data: ConnectionWorkflow[];
}
/**
 * Export Workflows API response type
 */
interface ExportsAPIResponse extends IrminAPIResponse {
  data: ExportWorkflow[];
}
/**
 * Action Workflows API response type
 */
interface ActionsAPIResponse extends IrminAPIResponse {
  data: ActionWorkflow[];
}

/**
 * Workflow API service
 *
 * Responsible for all workflow related API calls,
 * except for what is Workflow type specific. Those are handled by the specific services,
 * like ConnectionWorkflowService, ExportService, and ActionService.
 */
class WorkflowService {
  private static instance: WorkflowService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link WorkflowService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(locale: Locale, apiToken: string): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService(locale, apiToken);
    } else {
      // Update the existing instance
      WorkflowService.instance.api.setProps(locale, apiToken);
    }
    return WorkflowService.instance;
  }

  /**
   * Update a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-update | Irmin API docs}
   *
   * @param workflowId - The ID of the workflow to update
   * @param workflow - The updated workflow object
   *
   * @returns response from the API or example data
   */
  async updateWorkflow(
    workflowId: number,
    workflow: Workflow
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());
      formData.append('name', workflow.name);
      formData.append('description', workflow.description ?? '');
      formData.append('documentation', workflow.documentation ?? '');
      formData.append('cron_syntax', workflow.cron_syntax ?? '');

      const response = await this.api.fetch(`/v1/workflows/update`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Update workflow error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a Workflow by ID
   *
   * @todo What to do with the associated data repos, workspace DB tables, runs etc?
   *
   * @todo Provide link to Irmin API docs
   *
   * @param workflowId - The ID of the workflow to delete
   */
  async deleteWorkflow(workflowId: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('workflow', workflowId.toString());

      const response = await this.api.fetch(`/v1/workflows/delete`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Delete workflow error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Pause a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-pause | Irmin API docs}
   *
   * @param workflowId - ID of the workflow to pause
   *
   * @returns response from the API or example data
   */
  async pauseWorkflow(workflowId: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());

      const response = await this.api.fetch(`/v1/workflows/pause`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Pause workflow error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Resume a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-resume | Irmin API docs}
   *
   * @param workflowId - ID of the workflow to resume
   *
   * @returns response from the API or example data
   */
  async resumeWorkflow(workflowId: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());

      const response = await this.api.fetch(`/v1/workflows/resume`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Resume workflow error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Reassign a Workflow to a new owner
   * {@link https://api.irmin.dev/docs#workflows-POSTv1-workflows-reassign | Irmin API docs}
   *
   * @param workflow - The workflow to reassign
   * @param newOwner - The new owner of the workflow
   *
   * @returns response from the API or example data
   */
  async reassignWorkflow(
    workflow: Workflow,
    newOwner: WorkspaceUser
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('workflow', workflow.id.toString());
      formData.append('assignee', newOwner.id.toString());

      const response = await this.api.fetch(`/v1/workflows/reassign`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error('Reassign workflow error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch all Workflow Runs
   *
   * @todo Provide link to Irmin API docs
   *
   * @returns response from the API or example data
   */
  async fetchRuns(): Promise<WorkflowRunsAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleWorkflowRuns };
    try {
      const response = (await this.api.fetch(`/v1/workflows/runs`, {
        method: 'GET',
      })) as WorkflowRunsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workflow runs error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleWorkflowRuns };
      throw error;
    }
  }

  /**
   * Fetch Workflow Runs by Workflow ID
   *
   * @todo Provide link to Irmin API docs
   *
   * @param workflowId - The ID of the workflow to fetch the runs for
   *
   * @returns response from the API or example data
   */
  async fetchRunsByWorkflow(
    workflowId: number
  ): Promise<WorkflowRunsAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data:
          exampleWorkflowRuns.filter((val) => val.workflow_id === workflowId) ??
          exampleWorkflowRuns,
      };
    try {
      const response = (await this.api.fetch(
        `/v1/workflows/${workflowId}/runs`,
        {
          method: 'GET',
        }
      )) as WorkflowRunsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workflow runs by workflow error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data:
            exampleWorkflowRuns.filter(
              (val) => val.workflow_id === workflowId
            ) ?? exampleWorkflowRuns,
        };
      throw error;
    }
  }

  /**
   * Fetch all Connection Workflows
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections | Irmin API docs}
   * @returns response from the API or example data
   */
  async fetchConnections(): Promise<ConnectionsAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleConnections };
    try {
      const response = (await this.api.fetch(`/v1/connections`, {
        method: 'GET',
      })) as ConnectionsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch connections error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleConnections };
      throw error;
    }
  }

  /**
   * Fetch all Export Workflows
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchExports(): Promise<ExportsAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleExports };
    try {
      const response = (await this.api.fetch(`/v1/exports`, {
        method: 'GET',
      })) as ExportsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch exports error:', error);
      if (isDevelopment) return { ...exampleAPIResponse, data: exampleExports };
      throw error;
    }
  }

  /**
   * Fetch all Action Workflows
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchActions(): Promise<ActionsAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleActions };
    try {
      const response = (await this.api.fetch(`/v1/actions`, {
        method: 'GET',
      })) as ActionsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch actions error:', error);
      if (isDevelopment) return { ...exampleAPIResponse, data: exampleActions };
      throw error;
    }
  }
}

export default WorkflowService;
