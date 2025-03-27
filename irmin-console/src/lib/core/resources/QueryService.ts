import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminFileType } from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Query, QueryExecutionResult } from '@/types/core/StoredQuery';
import {
  exampleQueries,
  exampleQueryExecutionResult,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Query API service
 *
 * Responsible for query related API calls
 */
class QueryService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.executeScript = this.executeScript.bind(this);
    this.createQuery = this.createQuery.bind(this);
    this.getQueries = this.getQueries.bind(this);
    this.getQuery = this.getQuery.bind(this);
    this.deleteQuery = this.deleteQuery.bind(this);
    this.updateQuery = this.updateQuery.bind(this);
    this.executeQuery = this.executeQuery.bind(this);
    this.getQueryResults = this.getQueryResults.bind(this);
  }
  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Compute Sandbox.
   *
   * Even if the script is invalid, the API will return a 200 status code. The response will contain the error messages.
   *
   * @param type - type of the script. Can be for example `sql`. See {@link IrminFileType}
   * @param content - content of the script
   */
  async executeScript(
    type: IrminFileType,
    content: string
  ): Promise<IrminAPIResponse<QueryExecutionResult>> {
    if (isOfflineMode)
      return fake(
        exampleQueryExecutionResult()
      ) as IrminAPIResponse<QueryExecutionResult>;
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('content', content);
      const response = (await this.irminCore.fetchAPI(`/v1/queries/execute`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<QueryExecutionResult>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Execute script error');
      if (isDevelopment)
        return fake(
          exampleQueryExecutionResult()
        ) as IrminAPIResponse<QueryExecutionResult>;
      throw error;
    }
  }

  /**
   * Create a new query
   *
   * @param type - Type of the query (e.g., `sql`, `js`, etc.)
   * @param content - Content of the query
   * @param name - (optional) Name of the query
   * @param description - (optional) Description of the query
   * @param stored - (optional) Whether the query results are stored in the system
   * @param run - (optional) Whether to run the query immediately after creation.
   */
  async createQuery(
    type: IrminFileType,
    content: string,
    name?: string,
    description?: string,
    stored?: boolean,
    run?: boolean
  ): Promise<IrminAPIResponse<Query>> {
    if (isOfflineMode)
      return fake({
        ...exampleQueries[0],
        id: Math.random().toString(36).substring(2, 12) + '-query',
        type,
        name,
        description,
        content,
        stored,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        execution_time: 0,
        logs: [],
      }) as IrminAPIResponse<Query>;
    try {
      const body = new FormData();
      body.append('type', type);
      body.append('content', content);
      if (name) body.append('name', name);
      if (description) body.append('description', description);
      body.append('run', run ? 'true' : 'false');
      body.append('stored', stored ? 'true' : 'false');
      const response = (await this.irminCore.fetchAPI(`/v1/queries`, {
        method: 'POST',
        body,
      })) as IrminAPIResponse<Query>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create query error');
      if (isDevelopment)
        return fake(exampleQueries[0]) as IrminAPIResponse<Query>;
      throw error;
    }
  }

  /**
   * Get all queries in the workspace
   */
  async getQueries(): Promise<IrminAPIResponse<Query[]>> {
    if (isOfflineMode) return fake(exampleQueries) as IrminAPIResponse<Query[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/queries`, {
        method: 'GET',
      })) as IrminAPIResponse<Query[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment)
        return fake(exampleQueries) as IrminAPIResponse<Query[]>;
      throw error;
    }
  }

  /**
   * Get single query by ID
   *
   * @param query - ID of the query to get
   */
  async getQuery(query: string): Promise<IrminAPIResponse<Query>> {
    if (isOfflineMode)
      return fake(
        exampleQueries.find((item) => item.id === query)
      ) as IrminAPIResponse<Query>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/queries/${query}`, {
        method: 'GET',
      })) as IrminAPIResponse<Query>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment)
        return fake(exampleQueries[0]) as IrminAPIResponse<Query>;
      throw error;
    }
  }

  /**
   * Delete a query by ID
   *
   * @param query - ID of the query to delete
   */
  async deleteQuery(query: string): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = (await this.irminCore.fetchAPI(`/v1/queries/${query}`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Query>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment)
        return fake(exampleQueries[0]) as IrminAPIResponse<Query>;
      throw error;
    }
  }

  /**
   * Update a query by ID
   *
   * @param query - ID of the query to update
   * @param type - (optional) Type of the query (e.g., `sql`, `js`, etc.)
   * @param content - (optional) Content of the query
   * @param name - (optional) Name of the query
   * @param description - (optional) Description of the query
   * @param stored - (optional) Whether the query results are stored in the system
   */
  async updateQuery(
    query: string,
    type?: IrminFileType,
    content?: string,
    name?: string,
    description?: string,
    stored?: boolean
  ): Promise<IrminAPIResponse<Query>> {
    if (isOfflineMode) {
      const currentExample = exampleQueries.find((item) => item.id === query);
      if (!currentExample) throw new Error('Query not found');
      return fake({
        ...currentExample,
        type: type ?? currentExample.type,
        name: name ?? currentExample.name,
        description: description ?? currentExample.description,
        content: content ?? currentExample.content,
      }) as IrminAPIResponse<Query>;
    }
    try {
      const body = new FormData();
      body.append('_method', 'PATCH');
      if (type) body.append('type', type);
      if (content) body.append('content', content);
      if (name) body.append('name', name);
      if (description) body.append('description', description);
      body.append('stored', stored ? 'true' : 'false');
      const response = (await this.irminCore.fetchAPI(`/v1/queries/${query}`, {
        method: 'POST',
        body,
      })) as IrminAPIResponse<Query>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update query error');
      if (isDevelopment)
        return fake(exampleQueries[0]) as IrminAPIResponse<Query>;
      throw error;
    }
  }

  /**
   * Execute a query
   *
   * @param queryId - ID of the query to execute
   */
  async executeQuery(queryId: string): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/queries/${queryId}/execute`,
        {
          method: 'GET',
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Execute query error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Get result of a query, paginated
   *
   * @param queryId - ID of the query to fetch results for
   * @param page - Page number
   */
  async getQueryResults(
    queryId: string,
    page: number
  ): Promise<IrminAPIResponse<QueryExecutionResult>> {
    if (isOfflineMode)
      return fake(
        exampleQueryExecutionResult()
      ) as IrminAPIResponse<QueryExecutionResult>;
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/queries/${queryId}/results?page=${page}`,
        {
          method: 'GET',
        }
      );
      return response as IrminAPIResponse<QueryExecutionResult>;
    } catch (error) {
      console.error((error as Error).message, 'Get query results error');
      if (isDevelopment)
        return fake(
          exampleQueryExecutionResult()
        ) as IrminAPIResponse<QueryExecutionResult>;
      throw error;
    }
  }
}

export default QueryService;
