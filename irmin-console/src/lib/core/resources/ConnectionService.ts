import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Connection } from '@/types/core/Connection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleConnections } from '@/types/examples/core';
import { DynamicFieldValues } from '@/types/internal/DynamicField';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Connection API service
 *
 * Responsible for all Connection specific API calls.
 */
class ConnectionService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchConnections = this.fetchConnections.bind(this);
    this.fetchConnection = this.fetchConnection.bind(this);
    this.updateConnection = this.updateConnection.bind(this);
    this.reassignConnection = this.reassignConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.createConnection = this.createConnection.bind(this);
  }

  /**
   * Fetch all Connections for the current workspace
   */
  async fetchConnections(): Promise<IrminAPIResponse<Connection[]>> {
    if (isOfflineMode)
      return fake(exampleConnections) as IrminAPIResponse<Connection[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/connections`, {
        method: 'GET',
      })) as IrminAPIResponse<Connection[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connections error');
      if (isDevelopment)
        return fake(exampleConnections) as IrminAPIResponse<Connection[]>;
      throw error;
    }
  }

  /**
   * Fetch a Connection by ID
   *
   * @param connection - The ID of the Connection to fetch
   * @returns The Connection object
   */
  async fetchConnection(
    connection: string
  ): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/connections/${connection}`,
        {
          method: 'GET',
        }
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
   * Update a Connection
   *
   * @param connection - The ID of the Connection to update
   * @param data - The updated Connection properties
   */
  async updateConnection(
    connection: string,
    data: ItemUpdateProps
  ): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');

      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.documentation)
        formData.append('documentation', data.documentation);

      const response = (await this.irminCore.fetchAPI(
        `/v1/connections/${connection}`,
        {
          method: 'POST',
          body: formData,
        }
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
   * Reassign a Connection to a new owner
   *
   * @param connection - The ID of the Connection to reassign
   * @param newOwner -  The ID of the new owner for the Connection
   */
  async reassignConnection(
    connection: string,
    newOwner: string
  ): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      formData.append('owner', newOwner);

      const response = (await this.irminCore.fetchAPI(
        `/v1/connections/${connection}/reassign`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Connection>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Reassign connection error');
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
      throw error;
    }
  }

  /**
   * Delete a Connection by ID
   *
   * @param connection - The ID of the connection to delete
   */
  async deleteConnection(connection: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('connection', connection);

      const response = await this.irminCore.fetchAPI(`/v1/connections`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new connection and start sync with the provided details and settings for a workspace
   *
   * @param connectionProps - The new connection data
   * @param connectionProps.connectorID - The ID of the connector
   * @param connectionProps.connectionDetails - The connection details
   * @param connectionProps.connectionSettings - The connection settings
   * @param connectionProps.name - Name of the connection
   * @param connectionProps.description - Description of the connection
   *
   */
  async createConnection({
    connectorID,
    connectionDetails,
    connectionSettings,
    name,
    description,
  }: {
    connectorID: string;
    connectionDetails: DynamicFieldValues;
    connectionSettings: DynamicFieldValues;
    name: string;
    description: string;
  }): Promise<IrminAPIResponse<Connection>> {
    if (isOfflineMode)
      return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
    try {
      const formData = new FormData();
      formData.append('connector', connectorID.toString());
      formData.append('name', name);
      formData.append('description', description);
      Object.keys(connectionDetails).forEach((key) => {
        formData.append(`details[${key}]`, connectionDetails[key] as string);
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(`settings[${key}]`, connectionSettings[key] as string);
      });

      const res = (await this.irminCore.fetchAPI(`/v1/connections`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Connection>;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create new Connection'
      );
      if (isDevelopment)
        return fake(exampleConnections[0]) as IrminAPIResponse<Connection>;
      throw error;
    }
  }
}

export default ConnectionService;
