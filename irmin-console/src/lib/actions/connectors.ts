'use server';

import { initCore } from '@/lib/initCore';

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
