import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { LogEvent, WorkflowRunLogs } from '@/types/core/Log';
import {
  exampleConnectionLogEvents,
  exampleLogEvents,
  exampleRepositoryLogEvents,
  exampleWorkflowLogEvents,
  exampleWorkflowRunLogs,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log API service
 *
 * Responsible for all log related API calls
 */
class LogService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchLogEvents = this.fetchLogEvents.bind(this);
    this.fetchWorkflowLogEvents = this.fetchWorkflowLogEvents.bind(this);
    this.fetchRepositoryLogs = this.fetchRepositoryLogs.bind(this);
    this.fetchConnectionLogs = this.fetchConnectionLogs.bind(this);
    this.fetchWorkflowRunLogs = this.fetchWorkflowRunLogs.bind(this);
  }

  /**
   * Fetch general audit log events for the current workspace
   */
  async fetchLogEvents(): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/logs`, {
        method: 'GET',
      })) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific workflow
   *
   * @param workflow - ID of the workflow to fetch logs for
   */
  async fetchWorkflowLogEvents(
    workflow: string
  ): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleWorkflowLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflow}/logs`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Workflow Log Events error'
      );
      if (isDevelopment)
        return fake(exampleWorkflowLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific repository
   *
   * @param repository - Slug of the repository to fetch logs for
   */
  async fetchRepositoryLogs(
    repository: string
  ): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleRepositoryLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/logs`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Repository Log Events error'
      );
      if (isDevelopment)
        return fake(exampleRepositoryLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch log events for a specific connection
   *
   * @param connection - ID of the connection to fetch logs for
   */
  async fetchConnectionLogs(
    connection: string
  ): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleConnectionLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/connections/${connection}/logs`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Connection Log Events error'
      );
      if (isDevelopment)
        return fake(exampleConnectionLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }

  /**
   * Fetch logs for a specific workflow run
   *
   * @param workflow - ID of the workflow to fetch logs for
   * @param workflowRunID -  ID of the workflow run to fetch logs for
   */
  async fetchWorkflowRunLogs(
    workflow?: string,
    workflowRunID?: string
  ): Promise<IrminAPIResponse<WorkflowRunLogs>> {
    if (isOfflineMode)
      return fake(exampleWorkflowRunLogs) as IrminAPIResponse<WorkflowRunLogs>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workflows/${workflow}/runs/${workflowRunID}/logs`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<WorkflowRunLogs>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Workflow Run Logs error');
      if (isDevelopment)
        return fake(
          exampleWorkflowRunLogs
        ) as IrminAPIResponse<WorkflowRunLogs>;
      throw error;
    }
  }
}

export default LogService;
