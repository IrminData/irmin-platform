'use server';

import { initCore } from '@/lib/initCore';

import { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Server action to get the list of all connections for a given workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional token for authentication.
 * @returns The list of connections.
 */
export async function getConnections(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  // Get the connections using the updated service parameters
  const connectionsResponse =
    await irminCore.connectionService.fetchConnections({ workspace });
  return connectionsResponse.data;
}

/**
 * Server action to get a connection by its ID.
 *
 * @param workspace - The workspace slug.
 * @param connectionID - The connection's identifier.
 * @param token - Optional token for authentication.
 * @returns The connection data.
 */
export async function getConnection(
  workspace: string,
  connectionID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the connection using the updated service parameters
  const connectionResponse = await irminCore.connectionService.fetchConnection({
    workspace,
    connectionID,
  });
  return connectionResponse.data;
}

/**
 * Server action to create a new connection
 *
 * @param workspace - The workspace slug.
 * @param name - The connection name.
 * @param description - The connection description.
 * @param documentation - The connection documentation.
 * @param connectorID - The connector ID.
 * @param connectionDetails - The connection details.
 * @param connectionSettings - The connection settings.
 * @param token - (optional) token for authentication.
 * @returns The response containing the new connection.
 */
export async function createConnection(
  workspace: string,
  name: string,
  description: string,
  documentation: string,
  connectorID: string,
  connectionDetails: DynamicFieldValues,
  connectionSettings: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Create the connection using the updated service parameters
  const res = await irminCore.connectionService.createConnection({
    workspace,
    connectorID,
    name,
    description,
    documentation,
    connectionDetails,
    connectionSettings,
  });
  return res;
}

/**
 * Server action to update an existing connection.
 *
 * @param workspace - The workspace slug.
 * @param connectionID - The connection's identifier.
 * @param name - The connection name.
 * @param description - The connection description.
 * @param documentation - The connection documentation.
 * @param connectorID - The connector ID.
 * @param connectionDetails - The connection details.
 * @param connectionSettings - The connection settings.
 * @param token - Optional token for authentication.
 * @returns The response containing the updated connection.
 */
export async function updateConnection(
  workspace: string,
  connectionID: string,
  name?: string,
  description?: string,
  documentation?: string,
  connectorID?: string,
  connectionDetails?: DynamicFieldValues,
  connectionSettings?: DynamicFieldValues,
  token?: string
) {
  const irminCore = await initCore(token);
  // Update the connection using the updated service parameters
  const res = await irminCore.connectionService.updateConnection({
    workspace,
    connectionID,
    connectorID,
    name,
    description,
    documentation,
    connectionDetails,
    connectionSettings,
  });
  return res;
}

/**
 * Server action to delete a connection.
 *
 * @param workspace - The workspace slug.
 * @param connectionID - The connection's identifier.
 * @param token - Optional token for authentication.
 * @returns The response of the deletion operation.
 */
export async function deleteConnection(
  workspace: string,
  connectionID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Delete the connection using the updated service parameters
  const res = await irminCore.connectionService.deleteConnection({
    workspace,
    connectionID,
  });
  return res;
}

/**
 * Server action to transfer a connection to a new owner.
 *
 * @param workspace - The workspace slug.
 * @param connectionID - The connection's identifier.
 * @param ownerID - The new owner ID.
 * @param token - Optional token for authentication.
 * @returns The response containing the updated connection.
 */
export async function transferConnection(
  workspace: string,
  connectionID: string,
  ownerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Transfer connection ownership using the updated service parameters
  const res = await irminCore.connectionService.transferConnection({
    workspace,
    connectionID,
    newOwner: ownerID,
  });
  return res;
}
