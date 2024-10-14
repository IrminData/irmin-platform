import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Connection } from '@/types/core/Connection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { User } from '@/types/core/User';
import { exampleConnections } from '@/types/examples/core';
import exampleDynamicFields from '@/types/examples/exampleDynamicFields';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Connection API response type
 */
interface ConnectionsAPIResponse extends IrminAPIResponse {
  data: Connection[];
}

/**
 * Connection details and settings API response type
 */
interface ConnectionFieldsAPIResponse extends IrminAPIResponse {
  data: DynamicFields;
}

/**
 * Connection test API response type
 */
interface ConnectionTestAPIResponse extends IrminAPIResponse {
  data: {
    connected: boolean;
  };
}

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
    this.updateConnection = this.updateConnection.bind(this);
    this.reassignConnection = this.reassignConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.fetchNewConnectionDetails = this.fetchNewConnectionDetails.bind(this);
    this.testConnectionWithDetails = this.testConnectionWithDetails.bind(this);
    this.fetchNewConnectionSettings =
      this.fetchNewConnectionSettings.bind(this);
    this.createConnection = this.createConnection.bind(this);
  }

  /**
   * Fetch all Connections for the current workspace
   */
  async fetchConnections(): Promise<ConnectionsAPIResponse> {
    if (isOfflineMode)
      return fake(exampleConnections) as ConnectionsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/connections`, {
        method: 'GET',
      })) as ConnectionsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connections error');
      if (isDevelopment)
        return fake(exampleConnections) as ConnectionsAPIResponse;
      throw error;
    }
  }

  /**
   * Update a Connection
   *
   * @param connection - The ID of the Connection to update
   * @param data - The updated Connection object
   */
  async updateConnection(connection: string, data: Connection) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('connection', connection);

      formData.append('name', data.name);
      formData.append('description', data.description ?? '');
      formData.append('documentation', data.documentation ?? '');

      const response = await this.irminCore.fetch(`/v1/connections/update`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Reassign a Connection to a new owner
   *
   * @param connection - The ID of the Connection to reassign
   * @param newOwner - The new owner of the Connection
   */
  async reassignConnection(connection: string, newOwner: User) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('connection', connection);
      formData.append('assignee', newOwner.id.toString());

      const response = await this.irminCore.fetch(`/v1/connections/reassign`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Reassign connection error');
      if (isDevelopment) return fake();
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

      const response = await this.irminCore.fetch(`/v1/connections/delete`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Fetch connection details for a new connection.
   *
   * @param connectorID - The ID of the connector to fetch
   * @returns required details fields to create a connection
   */
  async fetchNewConnectionDetails(
    connectorID: string
  ): Promise<ConnectionFieldsAPIResponse> {
    try {
      if (isOfflineMode)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;
      const response = await this.irminCore.fetch(
        `/v1/connections/create/details?connector=${connectorID}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionFieldsAPIResponse;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to fetch new Connection details'
      );
      if (isDevelopment)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;
      throw error;
    }
  }

  /**
   * Test a connection with the provided connection details
   * @param connectorID - The ID of the connector
   * @param connectionDetails - The connection details to test
   * @returns whether the connection was successful or not
   */
  async testConnectionWithDetails(
    connectorID: string,
    connectionDetails: DynamicFieldValues
  ): Promise<ConnectionTestAPIResponse> {
    try {
      if (isOfflineMode)
        return fake({
          connected: true,
        }) as ConnectionTestAPIResponse;

      // Construct the query parameters from connectionDetails
      const params = new URLSearchParams({
        connector: connectorID.toString(),
        ...connectionDetails,
      });

      // Make the request
      const response = await this.irminCore.fetch(
        `/v1/connections/create/test-connection?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionTestAPIResponse;
    } catch (error) {
      console.error((error as Error).message, 'Failed to test new Connection');
      if (isDevelopment)
        return fake({
          connected: true,
        }) as ConnectionTestAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch connection settings for a new connection.
   *
   * @param connectorID - The ID of the connector to fetch
   * @param connectionDetails - The connection details to fetch settings for
   * @returns required settings fields to create a connection
   */
  async fetchNewConnectionSettings(
    connectorID: string,
    connectionDetails: DynamicFieldValues
  ): Promise<ConnectionFieldsAPIResponse> {
    try {
      if (isOfflineMode)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;

      // Construct the query parameters from connectionDetails
      const params = new URLSearchParams({
        connector: connectorID.toString(),
        ...connectionDetails,
      });

      // Make the request
      const response = await this.irminCore.fetch(
        `/v1/connections/create/settings?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionFieldsAPIResponse;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to fetch new Connection settings'
      );
      if (isDevelopment)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;
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
  }) {
    try {
      if (isOfflineMode) return fake();

      const formData = new FormData();

      formData.append('connector', connectorID.toString());
      Object.keys(connectionDetails).forEach((key) => {
        formData.append(`details[${key}]`, connectionDetails[key] as string);
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(`settings[${key}]`, connectionSettings[key] as string);
      });
      formData.append('name', name);
      formData.append('description', description);

      const res = await this.irminCore.fetch(`/v1/connections/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create new Connection'
      );
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default ConnectionService;
