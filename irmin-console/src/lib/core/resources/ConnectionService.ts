import type IrminCore from '@/lib/core';

import type {
  Connection,
  ConnectionFieldValues,
} from '@/types/core/Connection';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Interface for creating a new connection
 */
interface CreateConnectionRequest {
  name: string;
  connector: string;
  description?: string;
  documentation?: string;
  details: ConnectionFieldValues;
  settings: ConnectionFieldValues;
}

/**
 * Interface for updating a connection
 */
interface UpdateConnectionRequest {
  name?: string;
  connector?: string;
  description?: string;
  documentation?: string;
  details?: ConnectionFieldValues;
  settings?: ConnectionFieldValues;
}

/**
 * Interface for transferring connection ownership
 */
interface TransferConnectionOwnershipRequest {
  new_owner_id: string;
}

/**
 * Connection API service
 *
 * Provides methods to interact with connection endpoints.
 */
class ConnectionService {
  private irminCore: IrminCore;

  /**
   * Create a new ConnectionService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchConnections = this.fetchConnections.bind(this);
    this.fetchConnection = this.fetchConnection.bind(this);
    this.createConnection = this.createConnection.bind(this);
    this.updateConnection = this.updateConnection.bind(this);
    this.transferConnection = this.transferConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.fetchConnectionSchema = this.fetchConnectionSchema.bind(this);
  }

  /**
   * Fetch all connections for a workspace.
   *
   * - workspace: The workspace slug.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch connections from.
   * @returns IrminAPIResponse containing an array of Connection.
   */
  async fetchConnections({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Connection[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        { method: 'GET' }
      )) as IrminAPIResponse<Connection[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connections error');
      throw error;
    }
  }

  /**
   * Fetch a connection by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch the connection from.
   * @param props.connectionID - The ID of the connection to fetch.
   * @returns IrminAPIResponse containing the Connection.
   */
  async fetchConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Connection>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection error');
      throw error;
    }
  }

  /**
   * Create a new connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectorID - The connector ID.
   * @param props.name - The connection name.
   * @param props.description - The connection description.
   * @param props.documentation - The connection documentation.
   * @param props.connectionDetails - The connection details.
   * @param props.connectionSettings - The connection settings.
   * @returns IrminAPIResponse containing the new Connection.
   */
  async createConnection({
    workspace,
    connectorID,
    name,
    description,
    documentation,
    connectionDetails,
    connectionSettings,
  }: {
    workspace: string;
    connectorID: string;
    name: string;
    description: string;
    documentation: string;
    connectionDetails: ConnectionFieldValues;
    connectionSettings: ConnectionFieldValues;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: CreateConnectionRequest = {
        name,
        connector: connectorID,
        description,
        documentation,
        details: connectionDetails,
        settings: connectionSettings,
      };

      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create new connection'
      );
      throw error;
    }
  }

  /**
   * Update an existing connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.connectorID - The connector ID.
   * @param props.name - The connection name.
   * @param props.description - The connection description.
   * @param props.documentation - The connection documentation.
   * @param props.connectionDetails - The connection details.
   * @param props.connectionSettings - The connection settings.
   * @returns IrminAPIResponse containing the updated Connection.
   */
  async updateConnection({
    workspace,
    connectionID,
    connectorID,
    name,
    description,
    documentation,
    connectionDetails,
    connectionSettings,
  }: {
    workspace: string;
    connectionID: string;
    connectorID?: string;
    name?: string;
    description?: string;
    documentation?: string;
    connectionDetails?: ConnectionFieldValues;
    connectionSettings?: ConnectionFieldValues;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: UpdateConnectionRequest = {};

      if (connectorID !== undefined) requestBody.connector = connectorID;
      if (name !== undefined) requestBody.name = name;
      if (description !== undefined) requestBody.description = description;
      if (documentation !== undefined)
        requestBody.documentation = documentation;
      if (connectionDetails !== undefined)
        requestBody.details = connectionDetails;
      if (connectionSettings !== undefined)
        requestBody.settings = connectionSettings;

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connection error');
      throw error;
    }
  }

  /**
   * Transfer a connection to a new owner.
   *
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.newOwner - The new owner ID.
   * @returns IrminAPIResponse containing the updated Connection.
   */
  async transferConnection({
    workspace,
    connectionID,
    newOwner,
  }: {
    workspace: string;
    connectionID: string;
    newOwner: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: TransferConnectionOwnershipRequest = {
        new_owner_id: newOwner,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Transfer connection ownership error'
      );
      throw error;
    }
  }

  /**
   * Delete a connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connection error');
      throw error;
    }
  }

  /**
   * Fetch the schema of a connection for a specific operation method.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.operationMethod - The operation method (e.g., 'pull', 'push').
   * @param props.path - The path within the connection to get schema for, empty string means the root path.
   * @returns IrminAPIResponse containing the schema.
   */
  async fetchConnectionSchema({
    workspace,
    connectionID,
    operationMethod,
    path,
  }: {
    workspace: string;
    connectionID: string;
    operationMethod: string;
    path?: string;
  }): Promise<IrminAPIResponse<ObjectSchema>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('operation_method', operationMethod);
      if (path) urlParams.append('path', path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/schema?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection schema error');
      throw error;
    }
  }
}

export default ConnectionService;
