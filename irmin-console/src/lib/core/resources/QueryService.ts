import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { QueryResult, StoredQuery } from '@/types/core/StoredQuery';

/**
 * Interface for creating a query
 */
interface CreateQueryRequest {
  name?: string;
  description?: string;
  sql?: string;
}

/**
 * Interface for updating a query
 */
interface UpdateQueryRequest {
  name?: string;
  description?: string;
  sql?: string;
}

/**
 * Interface for transferring query ownership
 */
interface TransferQueryOwnershipRequest {
  new_owner_id: string;
}

/**
 * Interface for executing SQL
 */
interface ExecuteSQLRequest {
  sql?: string;
}

/**
 * Query API service
 *
 * Responsible for all stored query related API calls.
 */
class QueryService {
  private irminCore: IrminCore;

  /**
   * Create a new QueryService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listStoredQueries = this.listStoredQueries.bind(this);
    this.getStoredQuery = this.getStoredQuery.bind(this);
    this.createStoredQuery = this.createStoredQuery.bind(this);
    this.updateStoredQuery = this.updateStoredQuery.bind(this);
    this.deleteStoredQuery = this.deleteStoredQuery.bind(this);
    this.transferStoredQuery = this.transferStoredQuery.bind(this);
    this.executeStoredQuery = this.executeStoredQuery.bind(this);
    this.executeSQL = this.executeSQL.bind(this);
  }

  /**
   * List all stored queries in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of stored queries.
   */
  async listStoredQueries({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<StoredQuery[]>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<StoredQuery[]>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch stored queries error');
      throw error;
    }
  }

  /**
   * Get a stored query by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @returns IrminAPIResponse containing the stored query.
   */
  async getStoredQuery({
    workspace,
    queryID,
  }: {
    workspace: string;
    queryID: string;
  }): Promise<IrminAPIResponse<StoredQuery>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<StoredQuery>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch stored query error');
      throw error;
    }
  }

  /**
   * Create a new stored query.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.name - Name of the query.
   * @param props.description - Description of the query.
   * @param props.sql - SQL statement of the query.
   * @returns IrminAPIResponse containing the created stored query.
   */
  async createStoredQuery({
    workspace,
    name,
    description,
    sql,
  }: {
    workspace: string;
    name?: string;
    description?: string;
    sql?: string;
  }): Promise<IrminAPIResponse<StoredQuery>> {
    try {
      const requestBody: CreateQueryRequest = {
        name,
        description,
        sql,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<StoredQuery>;
    } catch (error) {
      console.error((error as Error).message, 'Create stored query error');
      throw error;
    }
  }

  /**
   * Update an existing stored query.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @param props.name - New name of the query.
   * @param props.description - New description of the query.
   * @param props.sql - New SQL statement of the query.
   * @returns IrminAPIResponse containing the updated stored query.
   */
  async updateStoredQuery({
    workspace,
    queryID,
    name,
    description,
    sql,
  }: {
    workspace: string;
    queryID: string;
    name?: string;
    description?: string;
    sql?: string;
  }): Promise<IrminAPIResponse<StoredQuery>> {
    try {
      const requestBody: UpdateQueryRequest = {};

      if (name !== undefined) requestBody.name = name;
      if (description !== undefined) requestBody.description = description;
      if (sql !== undefined) requestBody.sql = sql;

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<StoredQuery>;
    } catch (error) {
      console.error((error as Error).message, 'Update stored query error');
      throw error;
    }
  }

  /**
   * Delete a stored query.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @returns IrminAPIResponse containing the deletion result.
   */
  async deleteStoredQuery({
    workspace,
    queryID,
  }: {
    workspace: string;
    queryID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete stored query error');
      throw error;
    }
  }

  /**
   * Transfer ownership of a stored query.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @param props.newOwnerID - The new owner's ID.
   * @returns IrminAPIResponse containing the stored query with updated ownership.
   */
  async transferStoredQuery({
    workspace,
    queryID,
    newOwnerID,
  }: {
    workspace: string;
    queryID: string;
    newOwnerID: string;
  }): Promise<IrminAPIResponse<StoredQuery>> {
    try {
      const requestBody: TransferQueryOwnershipRequest = {
        new_owner_id: newOwnerID,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<StoredQuery>;
    } catch (error) {
      console.error((error as Error).message, 'Transfer stored query error');
      throw error;
    }
  }

  /**
   * Execute a stored query.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @returns IrminAPIResponse containing an array of result rows.
   */
  async executeStoredQuery({
    workspace,
    queryID,
  }: {
    workspace: string;
    queryID: string;
  }): Promise<IrminAPIResponse<QueryResult>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}/execute`,
        { method: 'POST' }
      );
      return response as IrminAPIResponse<QueryResult>;
    } catch (error) {
      console.error((error as Error).message, 'Execute stored query error');
      throw error;
    }
  }

  /**
   * Execute an SQL statement.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.sql - The SQL statement to execute.
   * @returns IrminAPIResponse containing an array of result rows.
   */
  async executeSQL({
    workspace,
    sql,
  }: {
    workspace: string;
    sql?: string;
  }): Promise<IrminAPIResponse<QueryResult>> {
    try {
      const requestBody: ExecuteSQLRequest = {
        sql,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/sql`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<QueryResult>;
    } catch (error) {
      console.error((error as Error).message, 'Execute SQL error');
      throw error;
    }
  }
}

export default QueryService;
