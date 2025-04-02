'use server';

import { initCore } from '@/lib/initCore';

import { ConnectorCapability } from '@/types/core/Connector';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Server action to get the list of all available connectors.
 *
 * @param props - The properties for the function.
 * @param props.token - Optional token for authentication.
 * @returns The list of connectors.
 */
export async function getConnectors({ token }: { token?: string }) {
  const irminCore = await initCore(token);
  // Get the connectors using the updated service signature
  const connectors = await irminCore.connectorService.fetchAllConnectors();
  return connectors;
}

/**
 * Server action to get a connector by its identifier.
 *
 * @param props - The properties for the function.
 * @param props.connectorId - The connector's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The connector.
 */
export async function getConnector({
  connectorId,
  token,
}: {
  connectorId: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the connector using the updated service parameters
  const connector = await irminCore.connectorService.fetchConnector({
    connectorId,
  });
  return connector;
}

/**
 * Server action to get the configuration fields for a connector.
 *
 * @param props - The properties for the function.
 * @param props.connectorId - The connector's identifier.
 * @param props.configurationType - Type of configuration fields: 'details' or 'settings'.
 * @param props.currentDetails - Optional current details field values.
 * @param props.currentSettings - Optional current settings field values.
 * @param props.token - Optional token for authentication.
 * @returns The configuration fields.
 */
export async function getConnectorConfigurationFields({
  connectorId,
  configurationType,
  currentDetails,
  currentSettings,
  token,
}: {
  connectorId: string;
  configurationType: 'details' | 'settings';
  currentDetails?: DynamicFieldValues;
  currentSettings?: DynamicFieldValues;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the configuration fields using updated service parameters
  const fields =
    await irminCore.connectorService.fetchConnectorConfigurationFields({
      connectorId,
      configurationType,
      currentDetails,
      currentSettings,
    });
  return fields;
}

/**
 * Server action to validate the configuration for a connector.
 *
 * @param props - The properties for the function.
 * @param props.connectorId - The connector's identifier.
 * @param props.details - Optional details field values.
 * @param props.settings - Optional settings field values.
 * @param props.token - Optional token for authentication.
 * @returns The validation result.
 */
export async function validateConnectorConfiguration({
  connectorId,
  details,
  settings,
  token,
}: {
  connectorId: string;
  details?: DynamicFieldValues;
  settings?: DynamicFieldValues;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.connectorId - The connector's identifier.
 * @param props.operation - The connector capability for which to fetch the schema.
 * @param props.details - Optional details field values.
 * @param props.settings - Optional settings field values.
 * @param props.token - Optional token for authentication.
 * @returns The object schema.
 */
export async function getConnectorSchema({
  connectorId,
  operation,
  details,
  settings,
  token,
}: {
  connectorId: string;
  operation: ConnectorCapability;
  details?: DynamicFieldValues;
  settings?: DynamicFieldValues;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the connector schema using updated service parameters
  const schema = await irminCore.connectorService.fetchConnectorSchema({
    connectorId,
    operation,
    details,
    settings,
  });
  return schema;
}
