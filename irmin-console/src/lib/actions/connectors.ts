'use server';

import { initCore } from '@/lib/initCore';

import { ConnectorCapability } from '@/types/core/Connector';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Server action to get the list of all available connectors.
 *
 * @returns The list of connectors
 */
export async function getConnectors(token?: string) {
  const irminCore = await initCore(token);
  // Get the connectors
  const connectors = await irminCore.connectorService.fetchAllConnectors();
  return connectors.data;
}

/**
 * Server action to get a connector by id.
 *
 * @returns The connector
 */
export async function getConnector(connectorId: string, token?: string) {
  const irminCore = await initCore(token);
  // Get the connector
  const connector =
    await irminCore.connectorService.fetchConnector(connectorId);
  return connector.data;
}

/**
 * Server action to get the configuration fields for a connector.
 *
 * @returns The configuration fields
 */
export async function getConnectorConfigurationFields(
  connectorId: string,
  configurationType: 'details' | 'settings',
  currentDetails?: DynamicFieldValues,
  currentSettings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the configuration fields
  const fields =
    await irminCore.connectorService.fetchConnectorConfigurationFields(
      connectorId,
      configurationType,
      currentDetails,
      currentSettings
    );
  return fields.data;
}

/**
 * Server action to validate the configuration for a connector.
 *
 * @returns The validation result
 */
export async function validateConnectorConfiguration(
  connectorId: string,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Validate the configuration
  const validationResult =
    await irminCore.connectorService.validateConnectorConfiguration(
      connectorId,
      details,
      settings
    );
  return validationResult;
}

/**
 * Server action fetch connector schema for a specific operation.
 *
 * @returns The object schema
 */
export async function getConnectorSchema(
  connectorId: string,
  operation: ConnectorCapability,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the schema
  const schema = await irminCore.connectorService.fetchConnectorSchema(
    connectorId,
    operation,
    details,
    settings
  );
  return schema.data;
}

/**
 * Server action to validate data against a schema.
 *
 * @returns Data validation result
 */
export async function validateDataAgainstConnectorSchema(
  connectorId: string,
  operation: ConnectorCapability,
  data: Blob,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Validate the data
  const validationResult =
    await irminCore.connectorService.validateConnectorData(
      connectorId,
      operation,
      data,
      details,
      settings
    );
  return validationResult;
}
