import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Connection } from '@/types/core/Connection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleConnections } from '@/types/examples/core';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    if (isOfflineMode)
      return fake(exampleConnections) as IrminAPIResponse<Connection[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        { method: 'GET' }
      )) as IrminAPIResponse<Connection[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connections error');
      if (isDevelopment)
        return fake(exampleConnections) as IrminAPIResponse<Connection[]>;
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
    if (isOfflineMode)
      return fake(
        exampleConnections.find((item) => item.id === connectionID) ||
          exampleConnections[0]
      ) as IrminAPIResponse<Connection>;
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Connection>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection error');
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
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
    connectionDetails: DynamicFieldValues;
    connectionSettings: DynamicFieldValues;
  }): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      formData.append('connector', connectorID);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('documentation', documentation);
      Object.keys(connectionDetails).forEach((key) => {
        formData.append(`details[${key}]`, connectionDetails[key] as string);
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(`settings[${key}]`, connectionSettings[key] as string);
      });
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse<Connection>;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create new connection'
      );
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
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
    connectionDetails?: DynamicFieldValues;
    connectionSettings?: DynamicFieldValues;
  }): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(
        exampleConnections.find((item) => item.id === connectionID)
      ) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      if (connectorID) formData.append('connector', connectorID);
      if (name) formData.append('name', name);
      if (description) formData.append('description', description);
      if (documentation) formData.append('documentation', documentation);
      if (connectionDetails) {
        Object.keys(connectionDetails).forEach((key) => {
          formData.append(`details[${key}]`, connectionDetails[key] as string);
        });
      }
      if (connectionSettings) {
        Object.keys(connectionSettings).forEach((key) => {
          formData.append(
            `settings[${key}]`,
            connectionSettings[key] as string
          );
        });
      }
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'PATCH', body: formData }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connection error');
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
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
    if (isOfflineMode)
      return fake(
        exampleConnections.find((item) => item.id === connectionID)
      ) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      // Use the field name 'new_owner_id' to match the Go endpoint
      formData.append('new_owner_id', newOwner);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/transfer-ownership`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Transfer connection ownership error'
      );
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
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
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default ConnectionService;
