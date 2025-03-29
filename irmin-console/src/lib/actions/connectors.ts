'use server';

import { initCore } from '@/lib/initCore';

import { ConnectorCapability } from '@/types/core/Connector';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Server action to get the list of all available connectors.
 *
 * @param token - Optional token for authentication.
 * @returns The list of connectors.
 */
export async function getConnectors(token?: string) {
  const irminCore = await initCore(token);
  // Get the connectors using the updated service signature
  const connectors = await irminCore.connectorService.fetchAllConnectors();
  return connectors.data;
}

/**
 * Server action to get a connector by its identifier.
 *
 * @param connectorId - The connector's identifier.
 * @param token - Optional token for authentication.
 * @returns The connector.
 */
export async function getConnector(connectorId: string, token?: string) {
  const irminCore = await initCore(token);
  // Get the connector using the updated service parameters
  const connector = await irminCore.connectorService.fetchConnector({
    connectorId,
  });
  return connector.data;
}

/**
 * Server action to get the configuration fields for a connector.
 *
 * @param connectorId - The connector's identifier.
 * @param configurationType - Type of configuration fields: 'details' or 'settings'.
 * @param currentDetails - Optional current details field values.
 * @param currentSettings - Optional current settings field values.
 * @param token - Optional token for authentication.
 * @returns The configuration fields.
 */
export async function getConnectorConfigurationFields(
  connectorId: string,
  configurationType: 'details' | 'settings',
  currentDetails?: DynamicFieldValues,
  currentSettings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the configuration fields using updated service parameters
  const fields =
    await irminCore.connectorService.fetchConnectorConfigurationFields({
      connectorId,
      configurationType,
      currentDetails,
      currentSettings,
    });
  return fields.data;
}

/**
 * Server action to validate the configuration for a connector.
 *
 * @param connectorId - The connector's identifier.
 * @param details - Optional details field values.
 * @param settings - Optional settings field values.
 * @param token - Optional token for authentication.
 * @returns The validation result.
 */
export async function validateConnectorConfiguration(
  connectorId: string,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Validate the connector configuration using updated service parameters
  const validationResult =
    await irminCore.connectorService.validateConnectorConfiguration({
      connectorId,
      details,
      settings,
    });
  return validationResult;
}

/**
 * Server action to fetch the connector schema for a specific operation.
 *
 * @param connectorId - The connector's identifier.
 * @param operation - The connector capability for which to fetch the schema.
 * @param details - Optional details field values.
 * @param settings - Optional settings field values.
 * @param token - Optional token for authentication.
 * @returns The object schema.
 */
export async function getConnectorSchema(
  connectorId: string,
  operation: ConnectorCapability,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the connector schema using updated service parameters
  const schema = await irminCore.connectorService.fetchConnectorSchema({
    connectorId,
    operation,
    details,
    settings,
  });
  return schema.data;
}
