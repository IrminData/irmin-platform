import { defaultLocale, Locale } from '@/dictionaries';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import {
  ConnectionDetailsAndSettings,
  ConnectionDetailsAndSettingsFields,
} from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface ConnectionDetailsAndSettingsAPIResponse extends IrminAPIResponse {
  data: ConnectionDetailsAndSettingsFields;
}
interface ConnectionTestAPIResponse extends IrminAPIResponse {
  data: {
    connected: boolean;
  };
}

class ConnectionService {
  private static instance: ConnectionService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  public static getInstance(locale: Locale): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService(locale);
    } else {
      // Update the locale if the instance already exists
      ConnectionService.instance.setLocale(locale);
    }
    return ConnectionService.instance;
  }

  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch connection details for a new connection.
   * @param {number} connectorID - The ID of the connector to fetch
   * @returns {Promise<ConnectionDetailsAndSettingsAPIResponse>}
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-details Irmin API docs}
   */
  async fetchNewConnectionDetails(
    connectorID: number
  ): Promise<ConnectionDetailsAndSettingsAPIResponse> {
    try {
      const response = await fetchWithCredentials(
        `${api_base}/v1/connections/create/details?connector=${connectorID}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      );
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }

  /**
   * Test a connection with the provided connection details
   * @param {number} connectorID - The ID of the connector
   * @param {ConnectionDetailsAndSettings} connectionDetails - The connection details to test
   * @returns {Promise<ConnectionTestAPIResponse>}
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-test-connection Irmin API docs}
   */
  async testConnectionWithDetails(
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
      const url = `${api_base}/v1/connections/create/test-connection?${params.toString()}`;

      // Make the request
      const response = await fetchWithCredentials(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      );
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
   * @returns {Promise<ConnectionDetailsAndSettingsAPIResponse>}
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-settings Irmin API docs}
   */
  async fetchNewConnectionSettings(
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
      const url = `${api_base}/v1/connections/create/settings?${params.toString()}`;

      // Make the request
      const response = await fetchWithCredentials(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      );
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }

  /**
   * Create a new connection and start sync with the provided details and settings for a workspace
   * @param {number} connectorID - The ID of the connector
   * @param {string} connectionName - The name of the connection
   * @param {string} connectionCron - The cron syntax for the connection
   * @param {ConnectionDetailsAndSettings} connectionDetails - The connection details
   * @param {ConnectionDetailsAndSettings} connectionSettings - The connection settings
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workflows-POSTv1-connections-create Irmin API docs}
   */
  async createConnection(
    connectorID: number,
    connectionName: string,
    connectionCron: string,
    connectionDetails: ConnectionDetailsAndSettings,
    connectionSettings: ConnectionDetailsAndSettings
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      formData.append('connector', connectorID.toString());
      formData.append('name', connectionName);
      formData.append('cron_syntax', connectionCron);

      Object.keys(connectionDetails).forEach((key) => {
        formData.append(`details[${key}]`, connectionDetails[key] as string);
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(`settings[${key}]`, connectionSettings[key] as string);
      });

      const res = await fetchWithCredentials(
        `${api_base}/v1/connections/create`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return res;
    } catch (error) {
      console.error('Failed to create connection:', error);
      throw error;
    }
  }
}

export default ConnectionService;
