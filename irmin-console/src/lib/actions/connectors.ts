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
