import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { CollectionType } from '@/types/core/Collection';
import { IrminFileType } from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Query, QueryExecutionResult } from '@/types/core/Query';
import {
  exampleQueries,
  exampleQueryExecutionResult,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Query Execution Result API response type
 */
export interface QueryExecutionResultAPIResponse extends IrminAPIResponse {
  data: QueryExecutionResult;
}

/**
 * Query API response type - single query
 */
export interface QueryAPIResponse extends IrminAPIResponse {
  data: Query;
}

/**
 * Queries API response type - list of queries
 */
export interface QueriesAPIResponse extends IrminAPIResponse {
  data: Query[];
}

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
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   *
   * Even if the script is invalid, the API will return a 200 status code. The response will contain the error messages.
   *
   * @param type - type of the script. Can be for example `sql`. See {@link IrminFileType}
   * @param content - content of the script
   * @param exampleType - (optional) Type of the example data to return in offline mode
   */
  async executeScript(
    type: IrminFileType,
    content: string,
    exampleType?: CollectionType
  ): Promise<QueryExecutionResultAPIResponse> {
    if (isOfflineMode)
      return fake(
        exampleQueryExecutionResult(exampleType)
      ) as QueryExecutionResultAPIResponse;
    try {
      const body = new FormData();
      body.append('type', type);
      body.append('content', content);
      const response = (await this.irminCore.fetchAPI(`/v1/query/execute`, {
        method: 'POST',
        body,
      })) as QueryExecutionResultAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Execute script error');
      if (isDevelopment)
        return fake(
          exampleQueryExecutionResult(exampleType)
        ) as QueryExecutionResultAPIResponse;
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
  ): Promise<QueryAPIResponse> {
    if (isOfflineMode) return fake(exampleQueries[0]) as QueryAPIResponse;
    try {
      const body = new FormData();
      body.append('type', type);
      body.append('content', content);
      if (name) body.append('name', name);
      if (description) body.append('description', description);
      if (stored) body.append('stored', stored.toString());
      if (run) body.append('run', run.toString());
      const response = (await this.irminCore.fetchAPI(`/v1/query`, {
        method: 'POST',
        body,
      })) as QueryAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create query error');
      if (isDevelopment) return fake(exampleQueries[0]) as QueryAPIResponse;
      throw error;
    }
  }

  /**
   * Get all queries in the workspace
   */
  async getQueries(): Promise<QueriesAPIResponse> {
    if (isOfflineMode) return fake(exampleQueries) as QueriesAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/query`, {
        method: 'GET',
      })) as QueriesAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment) return fake(exampleQueries) as QueriesAPIResponse;
      throw error;
    }
  }

  /**
   * Get single query by ID
   *
   * @param query - ID of the query to get
   */
  async getQuery(query: string): Promise<QueryAPIResponse> {
    if (isOfflineMode) return fake(exampleQueries[0]) as QueryAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/query/${query}`, {
        method: 'GET',
      })) as QueryAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment) return fake(exampleQueries[0]) as QueryAPIResponse;
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
      const response = (await this.irminCore.fetchAPI(`/v1/query/${query}`, {
        method: 'POST',
        body: formData,
      })) as QueryAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get queries error');
      if (isDevelopment) return fake(exampleQueries[0]) as QueryAPIResponse;
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
  ): Promise<QueryAPIResponse> {
    if (isOfflineMode) return fake(exampleQueries[0]) as QueryAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'PATCH');
      if (type) body.append('type', type);
      if (content) body.append('content', content);
      if (name) body.append('name', name);
      if (description) body.append('description', description);
      if (stored) body.append('stored', stored.toString());
      const response = (await this.irminCore.fetchAPI(`/v1/query/${query}`, {
        method: 'POST',
        body,
      })) as QueryAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update query error');
      if (isDevelopment) return fake(exampleQueries[0]) as QueryAPIResponse;
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
        `/v1/query/${queryId}/execute`,
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
   * @param exampleType - (optional) Type of the example data to return in offline mode
   */
  async getQueryResults(
    queryId: string,
    page: number,
    exampleType?: 'table' | 'file' | 'folder'
  ): Promise<QueryExecutionResultAPIResponse> {
    if (isOfflineMode)
      return fake(
        exampleQueryExecutionResult(exampleType)
      ) as QueryExecutionResultAPIResponse;
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/query/${queryId}/results?page=${page}`,
        {
          method: 'GET',
        }
      );
      return response as QueryExecutionResultAPIResponse;
    } catch (error) {
      console.error((error as Error).message, 'Get query results error');
      if (isDevelopment)
        return fake(
          exampleQueryExecutionResult(exampleType)
        ) as QueryExecutionResultAPIResponse;
      throw error;
    }
  }
}

export default QueryService;
