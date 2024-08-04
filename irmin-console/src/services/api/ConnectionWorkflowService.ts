import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import {
  ConnectionDetailsAndSettings,
  ConnectionDetailsAndSettingsFields,
} from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

/**
 * Connection details and settings API response type
 */
interface ConnectionDetailsAndSettingsAPIResponse extends IrminAPIResponse {
  data: ConnectionDetailsAndSettingsFields;
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
 * Connection Workflow API service
 *
 * Responsible for all Connection Workflow related API calls.
 */
class ConnectionWorkflowService {
  private static instance: ConnectionWorkflowService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link ConnectionWorkflowService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): ConnectionWorkflowService {
    if (!ConnectionWorkflowService.instance) {
      ConnectionWorkflowService.instance = new ConnectionWorkflowService(
        locale,
        apiToken
      );
    } else {
      // Update the existing instance
      ConnectionWorkflowService.instance.api.setProps(locale, apiToken);
    }
    return ConnectionWorkflowService.instance;
  }

  /**
   * Fetch connection details for a new connection.
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-details | Irmin API docs}
   * @param connectorID - The ID of the connector to fetch
   * @returns required details fields to create a connection
   */
  async fetchNewConnectionDetails(
    connectorID: number
  ): Promise<ConnectionDetailsAndSettingsAPIResponse> {
    try {
      const response = await this.api.fetch(
        `/v1/connections/create/details?connector=${connectorID}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Failed to fetch new connection workflow details:', error);
      throw error;
    }
  }

  /**
   * Test a connection with the provided connection details
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-test-connection | Irmin API docs}
   * @param connectorID - The ID of the connector
   * @param connectionDetails - The connection details to test
   * @returns whether the connection was successful or not
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

      // Make the request
      const response = await this.api.fetch(
        `/v1/connections/create/test-connection?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionTestAPIResponse;
    } catch (error) {
      console.error('Failed to test new connection workflow:', error);
      throw error;
    }
  }

  /**
   * Fetch connection settings for a new connection.
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-settings | Irmin API docs}
   * @param connectorID - The ID of the connector to fetch
   * @param connectionDetails - The connection details to fetch settings for
   * @returns required settings fields to create a connection
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

      // Make the request
      const response = await this.api.fetch(
        `/v1/connections/create/settings?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      return response as ConnectionDetailsAndSettingsAPIResponse;
    } catch (error) {
      console.error('Failed to fetch new connection workflow settings:', error);
      throw error;
    }
  }

  /**
   * Create a new connection and start sync with the provided details and settings for a workspace
   * {@link https://api.irmin.dev/docs#workflows-POSTv1-connections-create | Irmin API docs}
   *
   * @param connectionProps - The new connection data
   * @param connectionProps.connectorID - The ID of the connector
   * @param connectionProps.connectionDetails - The connection details
   * @param connectionProps.connectionSettings - The connection settings
   * @param connectionProps.name - Name of the workflow
   * @param connectionProps.description - Description of the workflow
   * @param connectionProps.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   *
   * @returns response from the API or example data
   */
  async createConnection({
    connectorID,
    connectionDetails,
    connectionSettings,
    name,
    description,
    cron_syntax,
  }: {
    connectorID: number;
    connectionDetails: ConnectionDetailsAndSettings;
    connectionSettings: ConnectionDetailsAndSettings;
    name: string;
    description: string;
    cron_syntax: string;
  }): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      // Export workflow properties
      formData.append('connector', connectorID.toString());
      Object.keys(connectionDetails).forEach((key) => {
        formData.append(`details[${key}]`, connectionDetails[key] as string);
      });
      Object.keys(connectionSettings).forEach((key) => {
        formData.append(`settings[${key}]`, connectionSettings[key] as string);
      });

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.api.fetch(`/v1/connections/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error('Failed to create connection workflow:', error);
      throw error;
    }
  }
}

export default ConnectionWorkflowService;
