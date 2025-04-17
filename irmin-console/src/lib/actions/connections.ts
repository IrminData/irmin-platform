'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of all connections for a given workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The list of connections.
 */
export async function getConnections({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the connections using the updated service parameters
  const connectionsResponse =
    await irminCore.connectionService.fetchConnections({ workspace });
  return connectionsResponse;
}

/**
 * Server action to get a connection by its ID.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.connectionID - The connection's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The connection data.
 */
export async function getConnection({
  workspace,
  connectionID,
  token,
}: {
  workspace: string;
  connectionID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the connection using the updated service parameters
  const connectionResponse = await irminCore.connectionService.fetchConnection({
    workspace,
    connectionID,
  });
  return connectionResponse;
}
