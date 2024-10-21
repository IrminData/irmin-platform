import IrminCore from '@/lib/core';

import createWorkflowScheduleFormData from '@/utils/createWorkflwoScheduleFormData';
import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/core/Workflow';
import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';
import {
  exampleActions,
  exampleExports,
  exampleImports,
  exampleWorkflowRuns,
  exampleWorkflows,
} from '@/types/examples/core';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Workflow Runs API response type, for fetching a list of workflow runs
 */
interface WorkflowRunsAPIResponse extends IrminAPIResponse {
  data: WorkflowRun[];
}
/**
 * Workflow Run API response type, for fetching a single workflow run
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
 * Workflows API response type
 */
interface WorkflowsAPIResponse extends IrminAPIResponse {
  data: Workflow[];
}

/**
 * Workflow API response type
 */
interface WorkflowAPIResponse extends IrminAPIResponse {
  data: Workflow;
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
    this.fetchWorkflows = this.fetchWorkflows.bind(this);
    this.fetchWorkflow = this.fetchWorkflow.bind(this);
    this.updateWorkflow = this.updateWorkflow.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.pauseWorkflow = this.pauseWorkflow.bind(this);
    this.resumeWorkflow = this.resumeWorkflow.bind(this);
    this.reassignWorkflow = this.reassignWorkflow.bind(this);
    this.fetchWorkflowRunByID = this.fetchWorkflowRunByID.bind(this);
    this.fetchRunsByWorkflow = this.fetchRunsByWorkflow.bind(this);
    this.triggerWorkflowRun = this.triggerWorkflowRun.bind(this);
    this.fetchImportWorkflows = this.fetchImportWorkflows.bind(this);
    this.fetchExportWorkflows = this.fetchExportWorkflows.bind(this);
    this.fetchActionWorkflows = this.fetchActionWorkflows.bind(this);
    this.createImportWorkflow = this.createImportWorkflow.bind(this);
    this.createExportWorkflow = this.createExportWorkflow.bind(this);
    this.createActionWorkflow = this.createActionWorkflow.bind(this);
  }

  /**
   * Fetch all workflows
   */
  async fetchWorkflows(): Promise<WorkflowsAPIResponse> {
    if (isOfflineMode) return fake(exampleWorkflows) as WorkflowsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/workflows`, {
        method: 'GET',
      })) as WorkflowsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflows error');
      if (isDevelopment) return fake(exampleImports) as WorkflowsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch workflow by ID
   *
   * @param workflowID - The ID of the workflow to fetch
   * @returns The workflow object
   */
  async fetchWorkflow(workflowID: string): Promise<WorkflowAPIResponse> {
    if (isOfflineMode) return fake(exampleWorkflows[0]) as WorkflowAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/workflows/${workflowID}`,
        {
          method: 'GET',
        }
      )) as WorkflowAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflows error');
      if (isDevelopment) return fake(exampleImports[0]) as WorkflowAPIResponse;
      throw error;
    }
  }

  /**
   * Update a Workflow
   *
   * @param workflowID - The ID of the workflow to update
   * @param data - The updated workflow properties
   */
  async updateWorkflow(workflowID: string, data: ItemUpdateProps) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowID);

      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.documentation)
        formData.append('documentation', data.documentation);

      // Append schedule properties if available
      if (data.schedule) {
        const scheduleFormData = createWorkflowScheduleFormData(data.schedule);
        for (const [key, value] of scheduleFormData.entries()) {
          formData.append(key, value);
        }
      }

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
   * @param workflowID - The ID of the workflow to delete
   */
  async deleteWorkflow(workflowID: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('workflow', workflowID);

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
   * @param workflowID - ID of the workflow to pause
   *
   */
  async pauseWorkflow(workflowID: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowID);

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
   *
   * @param workflowID - ID of the workflow to resume
   *
   */
  async resumeWorkflow(workflowID: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('workflow', workflowID);

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
   *
   * @param workflowID - The ID of the workflow to reassign
   * @param newOwner - ID of the new owner of the workflow
   *
   */
  async reassignWorkflow(workflowID: string, newOwner: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('workflow', workflowID);
      formData.append('assignee', newOwner);

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
   *
   * @param workflow - The ID of the workflow to fetch the runs for
   */
  async fetchRunsByWorkflow(
    workflow: string
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
   *
   * @param workflow - The ID of the workflow to fetch the runs for
   * @param workflowRun - The ID of the workflow run to fetch
   */
  async fetchWorkflowRunByID(
    workflow: string,
    workflowRun: string
  ): Promise<WorkflowRunAPIResponse> {
    const exampleRun =
      exampleWorkflowRuns.find((run) => run.id === workflowRun) ??
      exampleWorkflowRuns[0];
    if (isOfflineMode) return fake(exampleRun) as WorkflowRunAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      if (workflowRun) urlParams.append('id', workflowRun);
      const response = (await this.irminCore.fetch(
        `/v1/workflows/${workflow}/runs?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as WorkflowRunAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflow run by ID error');
      if (isDevelopment) return fake(exampleRun) as WorkflowRunAPIResponse;
      throw error;
    }
  }

  /**
   * Trigger a Workflow Run manually
   *
   * @param workflow - The ID of the workflow to trigger a run for
   */
  async triggerWorkflowRun(workflow: string): Promise<WorkflowRunAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkflowRuns[0]) as WorkflowRunAPIResponse;
    try {
      const formData = new FormData();
      formData.append('workflow_id', workflow);
      const response = (await this.irminCore.fetch(`/v1/workflows/run`, {
        method: 'POST',
        body: formData,
      })) as WorkflowRunAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Trigger workflow run error');
      if (isDevelopment)
        return fake(exampleWorkflowRuns[0]) as WorkflowRunAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch all Import Workflows
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
   *
   * @param props - Workflow properties
   * @param props.connection - ID of the connection to import data from
   * @param props.repository - Slug of the repository to import data to
   * @param props.branch - Branch to import the data to
   * @param props.path - Path in the repository to store the imported data in (default '/')
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.documentation - Documentation of the workflow
   * @param props.schedule - (optional) Schedule configuration of when to run the workflow
   */
  public async createImportWorkflow({
    connection,
    repository,
    branch,
    path,
    name,
    description,
    documentation,
    schedule,
  }: {
    connection: string;
    repository: string;
    branch: string;
    path: string;
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
  }): Promise<WorkflowAPIResponse> {
    if (isOfflineMode)
      return fake({
        ...exampleImports[0],
        id: `${Math.floor(Math.random() * 1000)}-new-import`,
        name,
        description,
        documentation,
        schedule,
      }) as WorkflowAPIResponse;
    try {
      // Create a new FormData object
      const formData = new FormData();

      // Import Workflow properties
      formData.append('connection', connection);
      formData.append('repository', repository);
      formData.append('branch', branch);
      formData.append('path', path);

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('documentation', documentation);

      // Append schedule properties if available
      if (schedule) {
        const scheduleFormData = createWorkflowScheduleFormData(schedule);
        for (const [key, value] of scheduleFormData.entries()) {
          formData.append(key, value);
        }
      }

      const res = (await this.irminCore.fetch(`/v1/workflows/imports/create`, {
        method: 'POST',
        body: formData,
      })) as WorkflowAPIResponse;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Import Workflow'
      );
      if (isDevelopment)
        return fake({
          ...exampleImports[0],
          id: `${Math.floor(Math.random() * 1000)}-new-import`,
          name,
          description,
          documentation,
          schedule,
        }) as WorkflowAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new Export Workflow
   *
   * @param props - Workflow properties
   * @param props.connection - ID of the connection to export data to
   * @param props.repository - Slug of the repository to export data from
   * @param props.path - Path in the repository to export the data from (default '/')
   * @param props.branch - Branch to export the data from
   * @param props.recursive - Whether to export recursively or not (default false)
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.documentation - Documentation of the workflow
   * @param props.schedule - (optional) Schedule configuration of when to run the workflow
   */
  public async createExportWorkflow({
    connection,
    repository,
    path,
    branch,
    recursive,
    name,
    description,
    documentation,
    schedule,
  }: {
    connection: string;
    repository: string;
    path: string;
    branch: string;
    recursive: boolean;
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
  }): Promise<WorkflowAPIResponse> {
    if (isOfflineMode)
      return fake({
        ...exampleExports[0],
        id: `${Math.floor(Math.random() * 1000)}-new-export`,
        name,
        description,
        documentation,
        schedule,
      }) as WorkflowAPIResponse;
    try {
      // Create a new FormData object
      const formData = new FormData();

      // Export Workflow properties
      formData.append('connection', connection);
      formData.append('repository', repository);
      formData.append('path', path);
      formData.append('branch', branch);
      formData.append('recursive', recursive ? 'true' : 'false');

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('documentation', documentation);

      // Append schedule properties if available
      if (schedule) {
        const scheduleFormData = createWorkflowScheduleFormData(schedule);
        for (const [key, value] of scheduleFormData.entries()) {
          formData.append(key, value);
        }
      }

      const res = (await this.irminCore.fetch(`/v1/workflows/exports/create`, {
        method: 'POST',
        body: formData,
      })) as WorkflowAPIResponse;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Export Workflow'
      );
      if (isDevelopment)
        return fake({
          ...exampleExports[0],
          id: `${Math.floor(Math.random() * 1000)}-new-export`,
          name,
          description,
          documentation,
          schedule,
        }) as WorkflowAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new Action Workflow
   *
   * @param props - Workflow properties
   * @param props.executable - Path to the script file to be executed
   * @param props.repository - Slug of the repository to put the action results in
   * @param props.branch - Branch to put the action results in
   * @param props.path - Path in the repository to put the action results in
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.documentation - Documentation of the workflow
   * @param props.schedule - (optional) Schedule configuration of when to run the workflow
   */
  public async createActionWorkflow({
    executable,
    repository,
    branch,
    path,
    name,
    description,
    documentation,
    schedule,
  }: {
    executable: string;
    repository: string;
    branch: string;
    path: string;
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
  }): Promise<WorkflowAPIResponse> {
    if (isOfflineMode)
      return fake({
        ...exampleActions[0],
        id: `${Math.floor(Math.random() * 1000)}-new-action`,
        name,
        description,
        documentation,
        schedule,
      }) as WorkflowAPIResponse;
    try {
      // Create a new FormData object
      const formData = new FormData();

      // Action Workflow properties
      formData.append('executable', executable);
      formData.append('repository', repository);
      formData.append('branch', branch);
      formData.append('path', path);

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('documentation', documentation);

      // Append schedule properties if available
      if (schedule) {
        const scheduleFormData = createWorkflowScheduleFormData(schedule);
        for (const [key, value] of scheduleFormData.entries()) {
          formData.append(key, value);
        }
      }

      const res = (await this.irminCore.fetch(`/v1/workflows/actions/create`, {
        method: 'POST',
        body: formData,
      })) as WorkflowAPIResponse;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Action Workflow'
      );
      if (isDevelopment)
        return fake({
          ...exampleActions[0],
          id: `${Math.floor(Math.random() * 1000)}-new-action`,
          name,
          description,
          documentation,
          schedule,
        }) as WorkflowAPIResponse;
      throw error;
    }
  }
}

export default WorkflowService;
