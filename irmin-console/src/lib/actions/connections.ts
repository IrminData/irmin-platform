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
