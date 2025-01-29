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
 * Responsible for all connector related API calls.
 */
class ConnectorService {
  private irminCore: IrminCore;

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
  }

  /**
   * Fetch all available connectors
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
   * Fetch a connector by id
   *
   * @param connectorId - ID of the connector to fetch
   */
  async fetchConnector(
    connectorId: string
  ): Promise<IrminAPIResponse<Connector>> {
    if (isOfflineMode)
      return fake(
        exampleConnectors.find((item) => item.id === connectorId)
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
   * Get configuration fields for a connector
   *
   * Details fields are used to establish a connection to the connector and the external system.
   * Settings fields are used to further configure the established connection.
   *
   * @param connectorId - ID of the connector to fetch configuration fields for
   * @param configurationType - Type of configuration fields to fetch (details or settings)
   * @param currentDetails - (optional) Current details values
   * @param currentSettings - (optional) Current settings values
   *
   * @returns Configuration fields for the connector
   */
  async fetchConnectorConfigurationFields(
    connectorId: string,
    configurationType: 'details' | 'settings',
    currentDetails?: DynamicFieldValues,
    currentSettings?: DynamicFieldValues
  ): Promise<IrminAPIResponse<DynamicFields>> {
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
        `/v1/connectors/${connectorId}/${configurationType}`,
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
   * Validate the configuration for a connector
   *
   * @param connectorId - ID of the connector to validate the configuration for
   * @param details - (optional) Details field values
   * @param settings - (optional) Settings field values
   *
   * @returns Validation result for the connector configuration
   */
  async validateConnectorConfiguration(
    connectorId: string,
    details?: DynamicFieldValues,
    settings?: DynamicFieldValues
  ): Promise<IrminAPIResponse<ConnectorConfigurationValidationResult>> {
    if (isOfflineMode) {
      if (details && settings)
        return fake(
          exampleConnectorConfigurationValidationResult
        ) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      if (details) {
        return fake({
          ok: false,
          can_connect: true,
          connection_details_valid: true,
          connection_settings_valid: false,
        }) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      }
      return fake({
        ok: false,
        can_connect: false,
        connection_details_valid: false,
        connection_settings_valid: false,
      }) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
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
        if (details && settings)
          return fake(
            exampleConnectorConfigurationValidationResult
          ) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
        if (details) {
          return fake({
            ok: false,
            can_connect: true,
            connection_details_valid: true,
            connection_settings_valid: false,
          }) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
        }
        return fake({
          ok: false,
          can_connect: false,
          connection_details_valid: false,
          connection_settings_valid: false,
        }) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      }
      throw error;
    }
  }

  /**
   * Fetch object schema for a connector.
   *
   * Provides the format of the data used in the operation.
   *
   * @param connectorId - ID of the connector to fetch the object schema for
   * @param operation - Operation to fetch the object schema for
   * @param details - (optional) Details field values
   * @param settings - (optional) Settings field values
   */
  async fetchConnectorSchema(
    connectorId: string,
    operation: ConnectorCapability,
    details?: DynamicFieldValues,
    settings?: DynamicFieldValues
  ): Promise<IrminAPIResponse<ObjectSchema>> {
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
   * Register a new connector with the system
   *
   * Note: This method is only available using the system token
   *
   * @param baseUrl - Base URL of the connector
   * @param systemToken - System token for the connector
   */
  async registerNewConnector(
    baseUrl: string,
    systemToken: string
  ): Promise<IrminAPIResponse<Connector>> {
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
   * Update a connector
   *
   * Note: This method is only available using the system token
   *
   * @param connectorId - ID of the connector to update
   * @param baseUrl - Base URL of the connector
   * @param systemToken - System token for the connector
   */
  async updateRegisteredConnector(
    connectorId: string,
    baseUrl: string,
    systemToken: string
  ): Promise<IrminAPIResponse<Connector>> {
    if (isOfflineMode)
      return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('url', baseUrl);
      formData.append('system_token', systemToken);
      const response = (await this.irminCore.fetchAPI(
        `/v1/connectors/${connectorId}`,
        {
          method: 'POST',
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
}

export default ConnectorService;
