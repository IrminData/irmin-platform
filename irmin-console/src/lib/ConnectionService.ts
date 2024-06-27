import { ConnectionDetailsAndSettings } from '@/types/Connector';
import {
  ConnectionDetailsAndSettingsAPIResponse,
  ConnectionTestAPIResponse,
  ConnectorsAPIResponse,
  IrminAPIResponse,
} from '@/types/IrminAPIResponse';
const api_base = process.env.NEXT_PUBLIC_API_URL;

class ConnectionService {
  private static instance: ConnectionService;

  private constructor() {}

  // Get the singleton instance of the ConnectionService class
  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  /**
   * Fetch data from the API with credentials
   * @param {string} url - The URL to fetch data from
   * @param {RequestInit} options - The fetch options
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to a IrminAPIResponse object
   * */
  private async fetchWithCredentials(
    url: string,
    options: RequestInit
  ): Promise<IrminAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include credentials with every request
      headers: {
        Accept: 'application/json',
        'Accept-Language': navigator.language ?? 'en',
        Referer: window.location.origin,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  /**
   * Fetch all connectors
   * @returns {Promise<ConnectorsAPIResponse>} A promise that resolves to a ConnectorsAPIResponse object
   * */
  async fetchAllConnectors(): Promise<ConnectorsAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/connectors`,
        {
          method: 'GET',
        }
      );
      return response as ConnectorsAPIResponse;
    } catch (error) {
      console.error('Fetch connectors error:', error);
      throw error;
    }
  }

  /**
   * Fetch connection details for a new connection.
   * @param {number} connectorID - The ID of the connector to fetch
   * @returns {Promise<ConnectionDetailsAndSettingsAPIResponse>} A promise that resolves to a ConnectionDetailsAndSettings object
   * */
  async fetchNewConnectionDetails(
    workspaceSlug: string,
    connectorID: number
  ): Promise<ConnectionDetailsAndSettingsAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/connections/new/details?connector=${connectorID}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }

  /**
   * Test a connection with the provided connection details
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} connectorID - The ID of the connector
   * @param {ConnectionDetailsAndSettings} connectionDetails - The connection details to test
   * @returns {Promise<ConnectionTestAPIResponse>} A promise that resolves to a ConnectionTestAPIResponse object
   * */
  async testConnectionWithDetails(
    workspaceSlug: string,
    connectorID: number,
    connectionDetails: ConnectionDetailsAndSettings
  ): Promise<ConnectionTestAPIResponse> {
    try {
      // Construct the query parameters from connectionDetails
      const params = new URLSearchParams({
        connector: connectorID.toString(),
        ...connectionDetails,
      });

      // Construct the full URL with query parameters
      const url = `${api_base}/v1/workspaces/${workspaceSlug}/connections/new/test-connection?${params.toString()}`;

      // Make the request
      const response = await this.fetchWithCredentials(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response as ConnectionTestAPIResponse;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }

  /**
   * Fetch connection settings for a new connection.
   * @param {number} connectorID - The ID of the connector to fetch
   * @param {ConnectionDetailsAndSettings} connectionDetails - The connection details to fetch settings for
   * @returns {Promise<ConnectionDetailsAndSettingsAPIResponse>} A promise that resolves to a ConnectionDetailsAndSettings object
   * */
  async fetchNewConnectionSettings(
    workspaceSlug: string,
    connectorID: number,
    connectionDetails: ConnectionDetailsAndSettings
  ): Promise<ConnectionDetailsAndSettingsAPIResponse> {
    try {
      // Construct the query parameters from connectionDetails
      const params = new URLSearchParams({
        connector: connectorID.toString(),
        ...connectionDetails,
      });

      // Construct the full URL with query parameters
      const url = `${api_base}/v1/workspaces/${workspaceSlug}/connections/new/settings?${params.toString()}`;

      // Make the request
      const response = await this.fetchWithCredentials(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }

  /**
   * Create a new connection and start sync with the provided details and settings for a workspace
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} connectorID - The ID of the connector
   * @param {string} connectionName - The name of the connection
   * @param {string} connectionCron - The cron syntax for the connection
   * @param {ConnectionDetailsAndSettings} connectionDetails - The connection details
   * @param {ConnectionDetailsAndSettings} connectionSettings - The connection settings
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to a IrminAPIResponse object
   */
  async createConnection(
    workspaceSlug: string,
    connectorID: number,
    connectionName: string,
    connectionCron: string,
    connectionDetails: ConnectionDetailsAndSettings,
    connectionSettings: ConnectionDetailsAndSettings
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      formData.append('connector_id', connectorID.toString());
      formData.append('connectionName', connectionName);
      formData.append('cron_syntax', connectionCron);

      Object.keys(connectionDetails).forEach((key) => {
        formData.append(
          `connectionDetails[${key}]`,
          connectionDetails[key] as string
        );
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(
          `connectionSettings[${key}]`,
          connectionSettings[key] as string
        );
      });

      const res = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/connections/new`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return res;
    } catch (error) {
      console.error('Failed to create connection:', error);
      throw error;
    }
  }
}

export default ConnectionService;
