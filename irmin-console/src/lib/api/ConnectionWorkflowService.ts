import { defaultLocale, Locale } from '@/dictionaries';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import {
  ConnectionDetailsAndSettings,
  ConnectionDetailsAndSettingsFields,
} from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Connection details and settings API response type
 * @internal
 */
interface ConnectionDetailsAndSettingsAPIResponse extends IrminAPIResponse {
  data: ConnectionDetailsAndSettingsFields;
}

/**
 * Connection test API response type
 * @internal
 */
interface ConnectionTestAPIResponse extends IrminAPIResponse {
  data: {
    connected: boolean;
  };
}

/**
 * Connection API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all connection related API calls.
 *
 * Like the other API services, this service is a singleton, meaning that only one
 * instance of the service can exist at a time.
 *
 * The service uses the {@link fetchWithCredentials} function to make API calls.
 *
 * If the environment is set to offline mode, service will return example data instead
 * of making API calls.
 *
 * If the environment is set to development, service will log the API call errors to
 * the console, but will not throw them. Instead, it will return the example data.
 *
 * Example data can be found here: `@/lib/exampleObjects/apiObjects`
 */
class ConnectionWorkflowService {
  private static instance: ConnectionWorkflowService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link ConnectionWorkflowService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): ConnectionWorkflowService {
    if (!ConnectionWorkflowService.instance) {
      ConnectionWorkflowService.instance = new ConnectionWorkflowService(
        locale
      );
    } else {
      // Update the locale if the instance already exists
      ConnectionWorkflowService.instance.setLocale(locale);
    }
    return ConnectionWorkflowService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch connection details for a new connection.
   * @param connectorID - The ID of the connector to fetch
   * @returns required details fields to create a connection
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-details | Irmin API docs}
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
   * @param connectorID - The ID of the connector
   * @param connectionDetails - The connection details to test
   * @returns whether the connection was successful or not
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-test-connection | Irmin API docs}
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
   * @param connectorID - The ID of the connector to fetch
   * @param connectionDetails - The connection details to fetch settings for
   * @returns required settings fields to create a connection
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-settings | Irmin API docs}
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
   * @param connectorID - The ID of the connector
   * @param connectionName - The name of the connection
   * @param connectionCron - The cron syntax for the connection
   * @param connectionDetails - The connection details
   * @param connectionSettings - The connection settings
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#workflows-POSTv1-connections-create | Irmin API docs}
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

export default ConnectionWorkflowService;
