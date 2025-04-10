import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { LogEvent } from '@/types/core/Log';
import { exampleLogEvents } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log API service
 *
 * Responsible for all log related API calls.
 */
class LogService {
  private irminCore: IrminCore;

  /**
   * Create a new LogService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchLogEvents = this.fetchLogEvents.bind(this);
    this.fetchUserLogEvents = this.fetchUserLogEvents.bind(this);
    this.fetchConnectionLogEvents = this.fetchConnectionLogEvents.bind(this);
    this.fetchRepositoryLogEvents = this.fetchRepositoryLogEvents.bind(this);
    this.fetchWorkflowLogEvents = this.fetchWorkflowLogEvents.bind(this);
    this.fetchWorkflowRunLogEvents = this.fetchWorkflowRunLogEvents.bind(this);
  }

  /**
   * Fetch general audit log events for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of LogEvent.
   */
  async fetchLogEvents({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific user.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user_id - The user ID.
   */
  async fetchUserLogEvents({
    workspace,
    user_id,
  }: {
    workspace: string;
    user_id: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?user_id=${user_id}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch User Log Events error');
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connection_id - The connection ID.
   */
  async fetchConnectionLogEvents({
    workspace,
    connection_id,
  }: {
    workspace: string;
    connection_id: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?connection_id=${connection_id}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Connection Log Events error'
      );
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific workflow run.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflow_run_id - The workflow run ID.
   */
  async fetchWorkflowRunLogEvents({
    workspace,
    workflow_run_id,
  }: {
    workspace: string;
    workflow_run_id: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?workflow_run_id=${workflow_run_id}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Workflow Run Log Events error'
      );
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository_id - The repository ID.
   */
  async fetchRepositoryLogEvents({
    workspace,
    repository_id,
  }: {
    workspace: string;
    repository_id: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?repository_id=${repository_id}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Repository Log Events error'
      );
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fech log events for a spceific workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflow_id - The workflow ID.
   */
  async fetchWorkflowLogEvents({
    workspace,
    workflow_id,
  }: {
    workspace: string;
    workflow_id: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?workflow_id=${workflow_id}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Workflow Log Events error'
      );
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }
}

export default LogService;
