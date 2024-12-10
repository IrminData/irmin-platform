'use server';

import { initCore } from '@/lib/initCore';

import { DynamicFieldValues } from '@/types/internal/DynamicField';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get the list of all connections for the current workspace.
 *
 * @returns The list of connections
 */
export async function getConnections(token?: string) {
  const irminCore = await initCore(token);
  // Get the connections
  const connections = await irminCore.connectionService.fetchConnections();
  return connections.data;
}

/**
 * Server action to get a connection by ID.
 *
 * @returns The list of connections
 */
export async function getConnection(id: string, token?: string) {
  const irminCore = await initCore(token);
  // Get the connection
  const connections = await irminCore.connectionService.fetchConnection(id);
  return connections.data;
}

/**
 * Server action to create a new connection.
 */
export async function createConnection(
  data: {
    connectorID: string;
    connectionDetails: DynamicFieldValues;
    connectionSettings: DynamicFieldValues;
    name: string;
    description: string;
  },
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.connectionService.createConnection(data);
  return res;
}

/**
 * Server action to update a connection.
 */
export async function updateConnection(
  connectionID: string,
  data: ItemUpdateProps,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.connectionService.updateConnection(
    connectionID,
    data
  );
  return res;
}

/**
 * Server action to delete a connection.
 */
export async function deleteConnection(connectionID: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.connectionService.deleteConnection(connectionID);
  return res;
}

/**
 * Server action to reassign a connection to a new owner.
 */
export async function reassignConnection(
  connectionID: string,
  ownerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.connectionService.reassignConnection(
    connectionID,
    ownerID
  );
  return res;
}

/**
 * Server action to create a new connection
 */
export async function createNewConnection(
  data: {
    connectorID: string;
    connectionDetails: DynamicFieldValues;
    connectionSettings: DynamicFieldValues;
    name: string;
    description: string;
  },
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.connectionService.createConnection(data);
  return res;
}
