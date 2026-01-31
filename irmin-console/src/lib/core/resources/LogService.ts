import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { LogEvent } from '@/types/core/Log';

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
    this.fetchLogEventsWithCursor = this.fetchLogEventsWithCursor.bind(this);
  }

  /**
   * Fetch general audit log events for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user_id - (Optional) The user ID.
   * @param props.workflow_id - (Optional) The workflow ID.
   * @param props.repository - (Optional) The repository slug.
   * @param props.connection_id - (Optional) The connection ID.
   * @param props.stored_query_id - (Optional) The stored query ID.
   * @param props.policy_id - (Optional) The policy ID.
   * @param props.repository_object_id - (Optional) The repository object ID.
   * @param props.search - (Optional) Search term to filter log events.
   * @param props.perPage - (Optional) Number of items per page.
   * @param props.page - (Optional) Page number.
   * @returns IrminAPIResponse containing an array of LogEvent.
   */
  async fetchLogEvents({
    workspace,
    user_id,
    workflow_id,
    repository,
    stored_query_id,
    policy_id,
    repository_object_id,
    connection_id,
    search = '',
    perPage = 100,
    page = 1,
  }: {
    workspace: string;
    user_id?: string;
    workflow_id?: string;
    repository?: string;
    stored_query_id?: string;
    policy_id?: string;
    repository_object_id?: string;
    connection_id?: string;
    search?: string;
    perPage?: number;
    page?: number;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (user_id) queryParams.append('user_id', user_id);
      if (workflow_id) queryParams.append('workflow_id', workflow_id);
      if (repository) queryParams.append('repository', repository);
      if (connection_id) queryParams.append('connection_id', connection_id);
      if (stored_query_id)
        queryParams.append('stored_query_id', stored_query_id);
      if (policy_id) queryParams.append('policy_id', policy_id);
      if (repository_object_id)
        queryParams.append('repository_object_id', repository_object_id);
      if (search) queryParams.append('search', search);
      if (perPage) queryParams.append('per_page', perPage.toString());
      if (page) queryParams.append('page', page.toString());

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?${queryParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');

      throw error;
    }
  }

  /**
   * Fetch log events using cursor-based pagination.
   * Cursor pagination is more efficient than page-based for deep pages (O(1) vs O(n)).
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user_id - (Optional) The user ID.
   * @param props.workflow_id - (Optional) The workflow ID.
   * @param props.repository - (Optional) The repository slug.
   * @param props.connection_id - (Optional) The connection ID.
   * @param props.stored_query_id - (Optional) The stored query ID.
   * @param props.policy_id - (Optional) The policy ID.
   * @param props.repository_object_id - (Optional) The repository object ID.
   * @param props.search - (Optional) Search term to filter log events.
   * @param props.limit - (Optional) Number of items to fetch.
   * @param props.cursor - (Optional) Cursor from previous response for next page.
   * @returns IrminAPIResponse containing an array of LogEvent with cursor pagination metadata.
   */
  async fetchLogEventsWithCursor({
    workspace,
    user_id,
    workflow_id,
    repository,
    stored_query_id,
    policy_id,
    repository_object_id,
    connection_id,
    search = '',
    limit = 100,
    cursor,
  }: {
    workspace: string;
    user_id?: string;
    workflow_id?: string;
    repository?: string;
    stored_query_id?: string;
    policy_id?: string;
    repository_object_id?: string;
    connection_id?: string;
    search?: string;
    limit?: number;
    cursor?: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    try {
      const queryParams = new URLSearchParams();

      queryParams.append('per_page', limit.toString());

      if (cursor) queryParams.append('cursor', cursor);
      if (user_id) queryParams.append('user_id', user_id);
      if (workflow_id) queryParams.append('workflow_id', workflow_id);
      if (repository) queryParams.append('repository', repository);
      if (connection_id) queryParams.append('connection_id', connection_id);
      if (stored_query_id)
        queryParams.append('stored_query_id', stored_query_id);
      if (policy_id) queryParams.append('policy_id', policy_id);
      if (repository_object_id)
        queryParams.append('repository_object_id', repository_object_id);
      if (search) queryParams.append('search', search);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs?${queryParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;

      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch Log Events with cursor error'
      );

      throw error;
    }
  }
}

export default LogService;
