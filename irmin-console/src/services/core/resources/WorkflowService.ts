import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/core/Workflow';
import { WorkspaceUser } from '@/types/core/Workspace';
import {
  exampleActions,
  exampleExports,
  exampleImports,
  exampleWorkflowRuns,
} from '@/types/examples/core';

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
 * Workflow Run API response type
 */
interface WorkflowRunAPIResponse extends IrminAPIResponse {
  data: WorkflowRun;
}
/**
 * Import Workflows API response type
 */
interface ImportsAPIResponse extends IrminAPIResponse {
  data: ImportWorkflow[];
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
 * Responsible for all workflow related API calls.
 */
class WorkflowService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.updateWorkflow = this.updateWorkflow.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.pauseWorkflow = this.pauseWorkflow.bind(this);
    this.resumeWorkflow = this.resumeWorkflow.bind(this);
    this.reassignWorkflow = this.reassignWorkflow.bind(this);
    this.fetchWorkflowRunByID = this.fetchWorkflowRunByID.bind(this);
    this.fetchRunsByWorkflow = this.fetchRunsByWorkflow.bind(this);
    this.fetchImportWorkflows = this.fetchImportWorkflows.bind(this);
    this.fetchExportWorkflows = this.fetchExportWorkflows.bind(this);
    this.fetchActionWorkflows = this.fetchActionWorkflows.bind(this);
    this.createImportWorkflow = this.createImportWorkflow.bind(this);
    this.createExportWorkflow = this.createExportWorkflow.bind(this);
    this.createActionWorkflow = this.createActionWorkflow.bind(this);
  }

  /**
   * Update a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-update | Irmin API docs}
   *
   * @param workflowId - The ID of the workflow to update
   * @param workflow - The updated workflow object
   *
   */
  async updateWorkflow(workflowId: number, workflow: Workflow) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());
      formData.append('name', workflow.name);
      formData.append('description', workflow.description ?? '');
      formData.append('documentation', workflow.documentation ?? '');
      formData.append('cron_syntax', workflow.cron_syntax ?? '');

      const response = await this.irminCore.fetch(`/v1/workflows/update`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update workflow error');
      if (isDevelopment) return fake();
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
  async deleteWorkflow(workflowId: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('workflow', workflowId.toString());

      const response = await this.irminCore.fetch(`/v1/workflows/delete`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete workflow error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Pause a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-pause | Irmin API docs}
   *
   * @param workflowId - ID of the workflow to pause
   *
   */
  async pauseWorkflow(workflowId: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());

      const response = await this.irminCore.fetch(`/v1/workflows/pause`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Pause workflow error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Resume a Workflow
   * {@link https://api.irmin.dev/docs#workflows-PATCHv1-workflows-resume | Irmin API docs}
   *
   * @param workflowId - ID of the workflow to resume
   *
   */
  async resumeWorkflow(workflowId: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowId.toString());

      const response = await this.irminCore.fetch(`/v1/workflows/resume`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Resume workflow error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Reassign a Workflow to a new owner
   * {@link https://api.irmin.dev/docs#workflows-POSTv1-workflows-reassign | Irmin API docs}
   *
   * @param workflowId - The ID of the workflow to reassign
   * @param newOwner - The new owner of the workflow
   *
   */
  async reassignWorkflow(workflowId: number, newOwner: WorkspaceUser) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('workflow', workflowId.toString());
      formData.append('assignee', newOwner.id.toString());

      const response = await this.irminCore.fetch(`/v1/workflows/reassign`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Reassign workflow error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Fetch Workflow Runs by Workflow
   * @todo Provide link to Irmin API docs
   *
   * @param workflow - The slug of the workflow to fetch the runs for
   */
  async fetchRunsByWorkflow(
    workflow: number
  ): Promise<WorkflowRunsAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkflowRuns) as WorkflowRunsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/workflows/${workflow}/runs`,
        {
          method: 'GET',
        }
      )) as WorkflowRunsAPIResponse;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch workflow runs by workflow error'
      );
      if (isDevelopment)
        return fake(exampleWorkflowRuns) as WorkflowRunsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch Workflow Run by Workflow and Run ID
   * @todo Provide link to Irmin API docs
   *
   * @param workflow - The slug of the workflow to fetch the runs for
   * @param workflowRun - The ID of the workflow run to fetch
   */
  async fetchWorkflowRunByID(
    workflow: string,
    workflowRun: string
  ): Promise<WorkflowRunAPIResponse> {
    const exampleRun =
      exampleWorkflowRuns.find((run) => run.id === parseInt(workflowRun)) ??
      exampleWorkflowRuns[0];
    if (isOfflineMode) return fake(exampleRun) as WorkflowRunAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/workflows/${workflow}/runs/${workflowRun}`,
        {
          method: 'GET',
        }
      )) as WorkflowRunAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflow run by id error');
      if (isDevelopment) return fake(exampleRun) as WorkflowRunAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch all Import Workflows
   * @todo Provide link to Irmin API docs
   */
  async fetchImportWorkflows(): Promise<ImportsAPIResponse> {
    if (isOfflineMode) return fake(exampleImports) as ImportsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/workflows/imports`, {
        method: 'GET',
      })) as ImportsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch import workflows error');
      if (isDevelopment) return fake(exampleImports) as ImportsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch all Export Workflows
   * @todo Provide link to Irmin API docs
   */
  async fetchExportWorkflows(): Promise<ExportsAPIResponse> {
    if (isOfflineMode) return fake(exampleExports) as ExportsAPIResponse;

    try {
      const response = (await this.irminCore.fetch(`/v1/workflows/exports`, {
        method: 'GET',
      })) as ExportsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch export workflows error');
      if (isDevelopment) return fake(exampleExports) as ExportsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch all Action Workflows
   * @todo Provide link to Irmin API docs
   */
  async fetchActionWorkflows(): Promise<ActionsAPIResponse> {
    if (isOfflineMode) return fake(exampleActions) as ActionsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/workflows/actions`, {
        method: 'GET',
      })) as ActionsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch actions error');
      if (isDevelopment) return fake(exampleActions) as ActionsAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new Import Workflow
   * @todo Provide link to Irmin API docs
   *
   * @param props - Workflow properties
   * @param props.connectionID - ID of the connection to import data from
   * @param props.repositoryID - ID of the repository to import data to
   * @param props.path - Path in the repository to store the imported data in (default '/')
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   */
  public async createImportWorkflow({
    connectionID,
    repositoryID,
    path,
    name,
    description,
    cron_syntax,
  }: {
    connectionID: number | undefined;
    repositoryID: number | undefined;
    path: string;
    name: string;
    description: string;
    cron_syntax: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the connection and repository IDs are provided
      if (!connectionID || !repositoryID) return;

      // Create a new FormData object
      const formData = new FormData();

      // Import Workflow properties
      formData.append('connection', connectionID.toString());
      formData.append('repository', repositoryID.toString());
      formData.append('path', path);

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.irminCore.fetch(`/v1/workflows/imports/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Import Workflow'
      );
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new Export Workflow
   * @todo Provide link to Irmin API docs
   *
   * @param props - Workflow properties
   * @param props.connectionID - ID of the connection to export data to
   * @param props.repositoryID - ID of the repository to export data from
   * @param props.path - Path in the repository to export the data from (default '/')
   * @param props.recursive - Whether to export recursively or not (default false)
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   */
  public async createExportWorkflow({
    connectionID,
    repositoryID,
    path,
    recursive,
    name,
    description,
    cron_syntax,
  }: {
    connectionID: number | undefined;
    repositoryID: number | undefined;
    path: string;
    recursive: boolean;
    name: string;
    description: string;
    cron_syntax: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the connection and repository IDs are provided
      if (!connectionID || !repositoryID) return;

      // Create a new FormData object
      const formData = new FormData();

      // Export Workflow properties
      formData.append('connection', connectionID.toString());
      formData.append('repository', repositoryID.toString());
      formData.append('path', path);
      formData.append('recursive', recursive.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.irminCore.fetch(`/v1/workflows/exports/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Export Workflow'
      );
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new Action Workflow
   * @todo Provide link to Irmin API docs
   *
   * @param props - Workflow properties
   * @param props.path - Path to the script file to be executed
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   */
  public async createActionWorkflow({
    path,
    name,
    description,
    cron_syntax,
  }: {
    path: string;
    name: string;
    description: string;
    cron_syntax: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      // Create a new FormData object
      const formData = new FormData();

      // Action Workflow properties
      formData.append('source', path.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.irminCore.fetch(`/v1/workflows/actions/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Action Workflow'
      );
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default WorkflowService;
