import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { LogEvent, WorkflowRunLogs } from '@/types/core/Log';
import {
  exampleLogEvents,
  exampleWorkflowRunLogs,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Log Events API response type
 */
interface LogEventsAPIResponse extends IrminAPIResponse {
  data: LogEvent[];
}

/**
 * Workflow Run Logs API response type
 */
interface WorkflowRunLogsAPIResponse extends IrminAPIResponse {
  data: WorkflowRunLogs;
}

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
    this.fetchWorkflowRunLogs = this.fetchWorkflowRunLogs.bind(this);
  }

  /**
   * Fetch log events for the current workspace
   * @todo Provide link to Irmin API docs
   *
   * @param workflow - Optional. Slug of the workflow to fetch logs for
   */
  async fetchLogEvents(workflow?: string): Promise<LogEventsAPIResponse> {
    if (isOfflineMode) return fake(exampleLogEvents) as LogEventsAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      if (workflow) urlParams.append('workflow', workflow);
      const response = (await this.irminCore.fetch(
        `/v1/api/logs?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as LogEventsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');
      if (isDevelopment) return fake(exampleLogEvents) as LogEventsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch logs for a specific workflow run
   * @todo Provide link to Irmin API docs
   *
   * @param workflow - Optional. Slug of the workflow to fetch logs for
   * @param workflowRunID - Optional. ID of the workflow run to fetch logs for
   */
  async fetchWorkflowRunLogs(
    workflow?: string,
    workflowRunID?: string
  ): Promise<WorkflowRunLogsAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkflowRunLogs) as WorkflowRunLogsAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      if (workflow) urlParams.append('workflow', workflow);
      if (workflowRunID) urlParams.append('workflow_run_id', workflowRunID);
      const response = (await this.irminCore.fetch(
        `/v1/api/logs?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as WorkflowRunLogsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Workflow Run Logs error');
      if (isDevelopment)
        return fake(exampleWorkflowRunLogs) as WorkflowRunLogsAPIResponse;
      throw error;
    }
  }
}

export default LogService;
