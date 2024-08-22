import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import exampleDynamicFields from '@/types/examples/exampleDynamicFields';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

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
 * Connection Workflow API service
 *
 * Responsible for all Connection Workflow specific API calls.
 */
class ConnectionWorkflowService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchNewConnectionDetails = this.fetchNewConnectionDetails.bind(this);
    this.testConnectionWithDetails = this.testConnectionWithDetails.bind(this);
    this.fetchNewConnectionSettings =
      this.fetchNewConnectionSettings.bind(this);
    this.createConnection = this.createConnection.bind(this);
  }

  /**
   * Fetch connection details for a new connection.
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections-create-details | Irmin API docs}
   * @param connectorID - The ID of the connector to fetch
   * @returns required details fields to create a connection
   */
  async fetchNewConnectionDetails(
    connectorID: number
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
        'Failed to fetch new Connection Workflow details'
      );
      if (isDevelopment)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;
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
      console.error(
        (error as Error).message,
        'Failed to test new Connection Workflow'
      );
      if (isDevelopment)
        return fake({
          connected: true,
        }) as ConnectionTestAPIResponse;
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
        'Failed to fetch new Connection Workflow settings'
      );
      if (isDevelopment)
        return fake(exampleDynamicFields) as ConnectionFieldsAPIResponse;
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
    connectionDetails: DynamicFieldValues;
    connectionSettings: DynamicFieldValues;
    name: string;
    description: string;
    cron_syntax: string;
  }) {
    try {
      if (isOfflineMode) return fake();

      const formData = new FormData();

      // Export Workflow properties
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

      const res = await this.irminCore.fetch(`/v1/connections/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Connection Workflow'
      );
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default ConnectionWorkflowService;
