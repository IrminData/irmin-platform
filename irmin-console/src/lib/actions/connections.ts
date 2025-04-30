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

/**
 * Server action to get the schema of a connector.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.connectionID - The connection's identifier.
 * @param props.operation_method - The operation method for the connection.
 * @param props.token - Optional token for authentication.
 * @returns The schema data.
 */
export async function getConnectionSchema({
  workspace,
  connectionID,
  operation_method,
  token,
}: {
  workspace: string;
  connectionID: string;
  operation_method: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the connection schema using the updated service parameters
  const connectionSchemaResponse =
    await irminCore.connectionService.fetchConnectionSchema({
      workspace,
      connectionID,
      operation_method,
    });
  return connectionSchemaResponse;
}
