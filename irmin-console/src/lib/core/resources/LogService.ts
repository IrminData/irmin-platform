import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { LogEvent } from '@/types/core/Log';

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
  }

  /**
   * Fetch general audit log events for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   * @returns IrminAPIResponse containing an array of LogEvent.
   */
  async fetchLogEvents({
    workspace,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?per_page=${perPage}&page=${page}&page=${page}&per_page=${perPage}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');

      throw error;
    }
  }

  /**
   * Fetch log events for a specific user.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user_id - The user ID.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   */
  async fetchUserLogEvents({
    workspace,
    user_id,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    user_id: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?user_id=${user_id}&page=${page}&per_page=${perPage}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch User Log Events error');

      throw error;
    }
  }

  /**
   * Fetch log events for a specific connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connection_id - The connection ID.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   */
  async fetchConnectionLogEvents({
    workspace,
    connection_id,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    connection_id: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?connection_id=${connection_id}&page=${page}&per_page=${perPage}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Connection Log Events error'
      );
      throw error;
    }
  }

  /**
   * Fetch log events for a specific repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository_id - The repository ID.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   */
  async fetchRepositoryLogEvents({
    workspace,
    repository_id,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    repository_id: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?repository_id=${repository_id}&page=${page}&per_page=${perPage}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Repository Log Events error'
      );
      throw error;
    }
  }

  /**
   * Fech log events for a spceific workflow.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflow_id - The workflow ID.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   */
  async fetchWorkflowLogEvents({
    workspace,
    workflow_id,
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    workflow_id: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?workflow_id=${workflow_id}&page=${page}&per_page=${perPage}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Workflow Log Events error'
      );
      throw error;
    }
  }
}

export default LogService;
