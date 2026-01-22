import type IrminCore from '@/lib/core';

import type { ConnectionFieldValues } from '@/types/core/Connection';
import type {
  Connector,
  ConnectorConfigurationValidationResult,
} from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { DynamicFields } from '@/types/internal/DynamicField';

/**
 * Interface for creating/updating connectors
 */
interface ConnectorRequest {
  url: string;
  system_token: string;
}

/**
 * Interface for connector configuration operations
 */
interface ConnectorConfigurationRequest {
  details?: ConnectionFieldValues;
  settings?: ConnectionFieldValues;
}

/**
 * Connector API service
 *
 * Provides methods to interact with the connector API.
 */
class ConnectorService {
  private irminCore: IrminCore;

  /**
   * Create a new ConnectorService.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchAllConnectors = this.fetchAllConnectors.bind(this);
    this.fetchConnector = this.fetchConnector.bind(this);
    this.fetchConnectorConfigurationFields =
      this.fetchConnectorConfigurationFields.bind(this);
    this.validateConnectorConfiguration =
      this.validateConnectorConfiguration.bind(this);
    this.registerNewConnector = this.registerNewConnector.bind(this);
    this.updateRegisteredConnector = this.updateRegisteredConnector.bind(this);
    this.deleteConnector = this.deleteConnector.bind(this);
  }

  /**
   * Fetch all available connectors.
   *
   * @returns IrminAPIResponse containing an array of Connector.
   */
  async fetchAllConnectors(): Promise<IrminAPIResponse<Connector[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/connectors`, {
        method: 'GET',
      })) as IrminAPIResponse<Connector[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connectors error');
      throw error;
    }
  }

  /**
   * Fetch a connector by ID.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @returns IrminAPIResponse containing the Connector.
   */
  async fetchConnector({
    connectorId,
  }: {
    connectorId: string;
  }): Promise<IrminAPIResponse<Connector>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connector error');
      throw error;
    }
  }

  /**
   * Fetch configuration fields for a connector.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @param props.configurationType - Type of configuration fields.
   * @param props.currentDetails - Current details field values.
   * @param props.currentSettings - Current settings field values.
   * @returns IrminAPIResponse containing DynamicFields.
   */
  async fetchConnectorConfigurationFields({
    connectorId,
    configurationType,
    currentDetails,
    currentSettings,
  }: {
    connectorId: string;
    configurationType: 'details' | 'settings';
    currentDetails?: ConnectionFieldValues;
    currentSettings?: ConnectionFieldValues;
  }): Promise<IrminAPIResponse<DynamicFields>> {
    try {
      const requestBody: ConnectorConfigurationRequest = {
        details: currentDetails || {},
        settings: currentSettings || {},
      };
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}/fields/${configurationType}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<DynamicFields>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch connector configuration fields error'
      );
      throw error;
    }
  }

  /**
   * Validate the configuration for a connector.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @param props.details - Details field values.
   * @param props.settings - Settings field values.
   * @returns IrminAPIResponse containing ConnectorConfigurationValidationResult.
   */
  async validateConnectorConfiguration({
    connectorId,
    details,
    settings,
  }: {
    connectorId: string;
    details?: ConnectionFieldValues;
    settings?: ConnectionFieldValues;
  }): Promise<IrminAPIResponse<ConnectorConfigurationValidationResult>> {
    try {
      const requestBody: ConnectorConfigurationRequest = {};

      if (details) {
        requestBody.details = details;
      }
      if (settings) {
        requestBody.settings = settings;
      }

      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Validate connector configuration error'
      );
      throw error;
    }
  }

  /**
   * Register a new connector.
   *
   * @param props - The parameters.
   * @param props.baseUrl - The base URL of the connector.
   * @param props.systemToken - The system token.
   * @returns IrminAPIResponse containing the Connector.
   */
  async registerNewConnector({
    baseUrl,
    systemToken,
  }: {
    baseUrl: string;
    systemToken: string;
  }): Promise<IrminAPIResponse<Connector>> {
    try {
      const requestBody: ConnectorRequest = {
        url: baseUrl,
        system_token: systemToken,
      };

      const response = (await this.irminCore.fetchAPI(`/v1/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Register new connector error');
      throw error;
    }
  }

  /**
   * Update a registered connector.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @param props.baseUrl - The base URL of the connector.
   * @param props.systemToken - The system token.
   * @returns IrminAPIResponse containing the updated Connector.
   */
  async updateRegisteredConnector({
    connectorId,
    baseUrl,
    systemToken,
  }: {
    connectorId: string;
    baseUrl: string;
    systemToken: string;
  }): Promise<IrminAPIResponse<Connector>> {
    try {
      const requestBody: ConnectorRequest = {
        url: baseUrl,
        system_token: systemToken,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connector error');
      throw error;
    }
  }

  /**
   * Delete a connector.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteConnector({
    connectorId,
  }: {
    connectorId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}`,
        {
          method: 'DELETE',
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connector error');
      throw error;
    }
  }
}

export default ConnectorService;
