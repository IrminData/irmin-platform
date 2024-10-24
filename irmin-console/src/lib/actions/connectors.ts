'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of all available connectors.
 *
 * @returns The list of connectors
 */
export async function getConnectors(token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the connectors
  const connectors = await irminCore.connectorService.fetchAllConnectors();
  return connectors.data;
}
