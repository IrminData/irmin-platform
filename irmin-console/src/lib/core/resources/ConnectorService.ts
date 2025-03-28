import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import {
  Connector,
  ConnectorCapability,
  ConnectorConfigurationValidationResult,
} from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import {
  exampleConnectorConfigurationValidationResult,
  exampleConnectors,
  exampleObjectSchema,
} from '@/types/examples/core';
import exampleDynamicFields from '@/types/examples/exampleDynamicFields';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.fetchConnectorSchema = this.fetchConnectorSchema.bind(this);
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
    if (isOfflineMode)
      return fake(exampleConnectors) as IrminAPIResponse<Connector[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/connectors`, {
        method: 'GET',
      })) as IrminAPIResponse<Connector[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connectors error');
      if (isDevelopment)
        return fake(exampleConnectors) as IrminAPIResponse<Connector[]>;
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
    if (isOfflineMode)
      return fake(
        exampleConnectors.find((item) => item.id === connectorId) ||
          exampleConnectors[0]
      ) as IrminAPIResponse<Connector>;
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
      if (isDevelopment)
        return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
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
    currentDetails?: DynamicFieldValues;
    currentSettings?: DynamicFieldValues;
  }): Promise<IrminAPIResponse<DynamicFields>> {
    if (isOfflineMode)
      return fake(exampleDynamicFields) as IrminAPIResponse<DynamicFields>;
    try {
      const formData = new FormData();
      if (currentDetails) {
        Object.keys(currentDetails).forEach((key) => {
          formData.append(`details[${key}]`, currentDetails[key] as string);
        });
      }
      if (currentSettings) {
        Object.keys(currentSettings).forEach((key) => {
          formData.append(`settings[${key}]`, currentSettings[key] as string);
        });
      }
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}/fields/${configurationType}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<DynamicFields>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch connector configuration fields error'
      );
      if (isDevelopment)
        return fake(exampleDynamicFields) as IrminAPIResponse<DynamicFields>;
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
    details?: DynamicFieldValues;
    settings?: DynamicFieldValues;
  }): Promise<IrminAPIResponse<ConnectorConfigurationValidationResult>> {
    if (isOfflineMode) {
      return fake(
        exampleConnectorConfigurationValidationResult
      ) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
    }
    try {
      const formData = new FormData();
      if (details) {
        Object.keys(details).forEach((key) => {
          formData.append(`details[${key}]`, details[key] as string);
        });
      }
      if (settings) {
        Object.keys(settings).forEach((key) => {
          formData.append(`settings[${key}]`, settings[key] as string);
        });
      }
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}/validate`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Validate connector configuration error'
      );
      if (isDevelopment) {
        return fake(
          exampleConnectorConfigurationValidationResult
        ) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      }
      throw error;
    }
  }

  /**
   * Fetch object schema for a connector.
   *
   * @param props - The parameters.
   * @param props.connectorId - The connector's identifier.
   * @param props.operation - The operation for which to fetch the schema.
   * @param props.details - Details field values.
   * @param props.settings - Settings field values.
   * @returns IrminAPIResponse containing ObjectSchema.
   */
  async fetchConnectorSchema({
    connectorId,
    operation,
    details,
    settings,
  }: {
    connectorId: string;
    operation: ConnectorCapability;
    details?: DynamicFieldValues;
    settings?: DynamicFieldValues;
  }): Promise<IrminAPIResponse<ObjectSchema>> {
    if (isOfflineMode)
      return fake(exampleObjectSchema) as IrminAPIResponse<ObjectSchema>;
    try {
      const formData = new FormData();
      if (details) {
        Object.keys(details).forEach((key) => {
          formData.append(`details[${key}]`, details[key] as string);
        });
      }
      if (settings) {
        Object.keys(settings).forEach((key) => {
          formData.append(`settings[${key}]`, settings[key] as string);
        });
      }
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}/schema/${operation}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object schema error');
      if (isDevelopment)
        return fake(exampleObjectSchema) as IrminAPIResponse<ObjectSchema>;
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
    if (isOfflineMode)
      return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
    try {
      const formData = new FormData();
      formData.append('url', baseUrl);
      formData.append('system_token', systemToken);
      const response = (await this.irminCore.fetchAPI(`/v1/connectors`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Register new connector error');
      if (isDevelopment)
        return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
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
    if (isOfflineMode)
      return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
    try {
      const formData = new FormData();
      formData.append('url', baseUrl);
      formData.append('system_token', systemToken);
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}`,
        {
          method: 'PATCH',
          body: formData,
        }
      )) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connector error');
      if (isDevelopment)
        return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
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
    if (isOfflineMode) return fake(null) as IrminAPIResponse;
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
      if (isDevelopment) return fake(null) as IrminAPIResponse;
      throw error;
    }
  }
}

export default ConnectorService;
