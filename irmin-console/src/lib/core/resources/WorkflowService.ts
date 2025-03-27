import IrminCore from '@/lib/core';

import createWorkflowScheduleFormData from '@/utils/createWorkflwoScheduleFormData';
import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { WorkflowSchedule } from '@/types/core/Schedule';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  PipelineStage,
  PipelineWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/core/Workflow';
import {
  exampleActions,
  exampleExports,
  exampleImports,
  examplePipelines,
  exampleWorkflowRuns,
  exampleWorkflows,
} from '@/types/examples/core';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.fetchImportWorkflows = this.fetchImportWorkflows.bind(this);
    this.fetchExportWorkflows = this.fetchExportWorkflows.bind(this);
    this.fetchActionWorkflows = this.fetchActionWorkflows.bind(this);
    this.fetchPipelineWorkflows = this.fetchPipelineWorkflows.bind(this);
    this.fetchWorkflow = this.fetchWorkflow.bind(this);
    this.updateWorkflow = this.updateWorkflow.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.pauseWorkflow = this.pauseWorkflow.bind(this);
    this.resumeWorkflow = this.resumeWorkflow.bind(this);
    this.reassignWorkflow = this.reassignWorkflow.bind(this);
    this.fetchWorkflowRunByID = this.fetchWorkflowRunByID.bind(this);
    this.fetchRunsByWorkflow = this.fetchRunsByWorkflow.bind(this);
    this.triggerWorkflowRun = this.triggerWorkflowRun.bind(this);
    this.createImportWorkflow = this.createImportWorkflow.bind(this);
    this.createExportWorkflow = this.createExportWorkflow.bind(this);
    this.createActionWorkflow = this.createActionWorkflow.bind(this);
    this.createPipelineWorkflow = this.createPipelineWorkflow.bind(this);
  }

  /**
   * Fetch all workflows
   */
  async fetchWorkflows(): Promise<IrminAPIResponse<Workflow[]>> {
    if (isOfflineMode)
      return fake(exampleWorkflows) as IrminAPIResponse<Workflow[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/workflows`, {
        method: 'GET',
      })) as IrminAPIResponse<Workflow[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflows error');
      if (isDevelopment)
        return fake(exampleImports) as IrminAPIResponse<Workflow[]>;
      throw error;
    }
  }

  /**
   * Fetch workflow by ID
   *
   * @param workflowID - The ID of the workflow to fetch
   * @returns The workflow object
   */
  async fetchWorkflow(workflowID: string): Promise<IrminAPIResponse<Workflow>> {
    if (isOfflineMode)
      return fake(
        exampleWorkflows.find((w) => w.id === workflowID)
      ) as IrminAPIResponse<Workflow>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Workflow>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflows error');
      if (isDevelopment)
        return fake(exampleWorkflows[0]) as IrminAPIResponse<Workflow>;
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

      const response = await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}`,
        {
          method: 'POST',
          body: formData,
        }
      );

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
      const response = await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete workflow error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Pause a Workflow
   *
   * @param workflowID - ID of the workflow to pause
   */
  async pauseWorkflow(workflowID: string) {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}/pause`,
        {
          method: 'GET',
        }
      );
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
      const response = await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}/resume`,
        {
          method: 'GET',
        }
      );
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
      formData.append('owner', newOwner);

      const response = await this.irminCore.fetchAPI(
        `/v1/workflows/${workflowID}/reassign`,
        {
          method: 'POST',
          body: formData,
        }
      );

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
  ): Promise<IrminAPIResponse<WorkflowRun[]>> {
    if (isOfflineMode)
      return fake(exampleWorkflowRuns) as IrminAPIResponse<WorkflowRun[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflow}/runs`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<WorkflowRun[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch workflow runs by workflow error'
      );
      if (isDevelopment)
        return fake(exampleWorkflowRuns) as IrminAPIResponse<WorkflowRun[]>;
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
  ): Promise<IrminAPIResponse<WorkflowRun>> {
    const exampleRun =
      exampleWorkflowRuns.find((run) => run.id === workflowRun) ??
      exampleWorkflowRuns[0];
    if (isOfflineMode) return fake(exampleRun) as IrminAPIResponse<WorkflowRun>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflow}/runs/${workflowRun}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<WorkflowRun>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workflow run by ID error');
      if (isDevelopment)
        return fake(exampleRun) as IrminAPIResponse<WorkflowRun>;
      throw error;
    }
  }

  /**
   * Trigger a Workflow Run manually
   *
   * @param workflow - The ID of the workflow to trigger a run for
   */
  async triggerWorkflowRun(
    workflow: string
  ): Promise<IrminAPIResponse<WorkflowRun>> {
    if (isOfflineMode)
      return fake(exampleWorkflowRuns[0]) as IrminAPIResponse<WorkflowRun>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflow}/run`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<WorkflowRun>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Trigger workflow run error');
      if (isDevelopment)
        return fake(exampleWorkflowRuns[0]) as IrminAPIResponse<WorkflowRun>;
      throw error;
    }
  }

  /**
   * Fetch all Import Workflows
   */
  async fetchImportWorkflows(): Promise<IrminAPIResponse<ImportWorkflow[]>> {
    if (isOfflineMode)
      return fake(exampleImports) as IrminAPIResponse<ImportWorkflow[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/workflows/imports`, {
        method: 'GET',
      })) as IrminAPIResponse<ImportWorkflow[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch import workflows error');
      if (isDevelopment)
        return fake(exampleImports) as IrminAPIResponse<ImportWorkflow[]>;
      throw error;
    }
  }

  /**
   * Fetch all Export Workflows
   */
  async fetchExportWorkflows(): Promise<IrminAPIResponse<ExportWorkflow[]>> {
    if (isOfflineMode)
      return fake(exampleExports) as IrminAPIResponse<ExportWorkflow[]>;

    try {
      const response = (await this.irminCore.fetchAPI(`/v1/workflows/exports`, {
        method: 'GET',
      })) as IrminAPIResponse<ExportWorkflow[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch export workflows error');
      if (isDevelopment)
        return fake(exampleExports) as IrminAPIResponse<ExportWorkflow[]>;
      throw error;
    }
  }

  /**
   * Fetch all Action Workflows
   */
  async fetchActionWorkflows(): Promise<IrminAPIResponse<ActionWorkflow[]>> {
    if (isOfflineMode)
      return fake(exampleActions) as IrminAPIResponse<ActionWorkflow[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/workflows/actions`, {
        method: 'GET',
      })) as IrminAPIResponse<ActionWorkflow[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch actions error');
      if (isDevelopment)
        return fake(exampleActions) as IrminAPIResponse<ActionWorkflow[]>;
      throw error;
    }
  }

  /**
   * Fetch all Pipeline Workflows
   */
  async fetchPipelineWorkflows(): Promise<
    IrminAPIResponse<PipelineWorkflow[]>
  > {
    if (isOfflineMode)
      return fake(examplePipelines) as IrminAPIResponse<PipelineWorkflow[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/pipelines`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<PipelineWorkflow[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch pipelines error');
      if (isDevelopment)
        return fake(examplePipelines) as IrminAPIResponse<PipelineWorkflow[]>;
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
  }): Promise<IrminAPIResponse<Workflow>> {
    if (isOfflineMode)
      return fake({
        ...exampleImports[0],
        id: `${Math.floor(Math.random() * 1000)}-new-import`,
        name,
        description,
        documentation,
        schedule,
      }) as IrminAPIResponse<Workflow>;
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

      const res = (await this.irminCore.fetchAPI(`/v1/workflows/imports`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Workflow>;
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
        }) as IrminAPIResponse<Workflow>;
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
  }): Promise<IrminAPIResponse<Workflow>> {
    if (isOfflineMode)
      return fake({
        ...exampleExports[0],
        id: `${Math.floor(Math.random() * 1000)}-new-export`,
        name,
        description,
        documentation,
        schedule,
      }) as IrminAPIResponse<Workflow>;
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

      const res = (await this.irminCore.fetchAPI(`/v1/workflows/exports`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Workflow>;
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
        }) as IrminAPIResponse<Workflow>;
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
  }): Promise<IrminAPIResponse<Workflow>> {
    if (isOfflineMode)
      return fake({
        ...exampleActions[0],
        id: `${Math.floor(Math.random() * 1000)}-new-action`,
        name,
        description,
        documentation,
        schedule,
      }) as IrminAPIResponse<Workflow>;
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

      const res = (await this.irminCore.fetchAPI(`/v1/workflows/actions`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Workflow>;
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
        }) as IrminAPIResponse<Workflow>;
      throw error;
    }
  }

  /**
   * Create a new Pipeline Workflow
   *
   * @param props - Workflow properties
   * @param props.stages - Stages of the pipeline in order
   * @param props.live - Whether the pipeline runs continuously or is running according to a schedule
   * @param props.name - Name of the workflow
   * @param props.description - Description of the workflow
   * @param props.documentation - Documentation of the workflow
   * @param props.schedule - (optional) Schedule configuration of when to run the workflow
   */
  public async createPipelineWorkflow({
    stages,
    live,
    name,
    description,
    documentation,
    schedule,
  }: {
    stages: PipelineStage[];
    live: boolean;
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
  }): Promise<IrminAPIResponse<Workflow>> {
    if (isOfflineMode)
      return fake({
        ...examplePipelines[0],
        id: `${Math.floor(Math.random() * 1000)}-new-pipeline`,
        stages,
        live,
        name,
        description,
        documentation,
        schedule,
      }) as IrminAPIResponse<Workflow>;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('documentation', documentation);
      formData.append('live', live ? 'true' : 'false');
      // Append schedule properties if available
      if (schedule) {
        const scheduleFormData = createWorkflowScheduleFormData(schedule);
        for (const [key, value] of scheduleFormData.entries()) {
          formData.append(key, value);
        }
      }
      // Append pipline stages
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        formData.append(`stages[${i}][description]`, stage.description);
        formData.append(`stages[${i}][write]`, stage.write ? 'true' : 'false');
        formData.append(`stages[${i}][read]`, stage.read ? 'true' : 'false');
        formData.append(`stages[${i}][type]`, stage.type);
        if (stage.type === 'action') {
          formData.append(`stages[${i}][executable]`, stage.executable);
        }
        if (stage.type === 'connection') {
          formData.append(`stages[${i}][connection]`, stage.connection.id);
          formData.append(
            `stages[${i}][connection_write_path]`,
            stage.connection_write_path
          );
          formData.append(
            `stages[${i}][connection_read_path]`,
            stage.connection_read_path
          );
        }
        if (stage.type === 'repository') {
          formData.append(`stages[${i}][repository]`, stage.repository.slug);
          formData.append(`stages[${i}][branch]`, stage.branch);
          formData.append(`stages[${i}][path]`, stage.path);
        }
      }
      // Create the pipeline
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/pipelines`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Workflow>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Pipeline Workflow'
      );
      if (isDevelopment)
        return fake({
          ...examplePipelines[0],
          id: `${Math.floor(Math.random() * 1000)}-new-pipeline`,
          stages,
          live,
          name,
          description,
          documentation,
          schedule,
        }) as IrminAPIResponse<Workflow>;
      throw error;
    }
  }
}

export default WorkflowService;
