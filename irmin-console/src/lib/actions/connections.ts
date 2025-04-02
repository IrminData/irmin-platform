'use server';

import { initCore } from '@/lib/initCore';

import { DynamicFieldValues } from '@/types/internal/DynamicField';

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
 * Server action to create a new connection.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.name - The connection name.
 * @param props.description - The connection description.
 * @param props.documentation - The connection documentation.
 * @param props.connectorID - The connector ID.
 * @param props.connectionDetails - The connection details.
 * @param props.connectionSettings - The connection settings.
 * @param props.token - (optional) token for authentication.
 * @returns The response containing the new connection.
 */
export async function createConnection({
  workspace,
  name,
  description,
  documentation,
  connectorID,
  connectionDetails,
  connectionSettings,
  token,
}: {
  workspace: string;
  name: string;
  description: string;
  documentation: string;
  connectorID: string;
  connectionDetails: DynamicFieldValues;
  connectionSettings: DynamicFieldValues;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.connectionID - The connection's identifier.
 * @param props.name - The connection name.
 * @param props.description - The connection description.
 * @param props.documentation - The connection documentation.
 * @param props.connectorID - The connector ID.
 * @param props.connectionDetails - The connection details.
 * @param props.connectionSettings - The connection settings.
 * @param props.token - Optional token for authentication.
 * @returns The response containing the updated connection.
 */
export async function updateConnection({
  workspace,
  connectionID,
  name,
  description,
  documentation,
  connectorID,
  connectionDetails,
  connectionSettings,
  token,
}: {
  workspace: string;
  connectionID: string;
  name?: string;
  description?: string;
  documentation?: string;
  connectorID?: string;
  connectionDetails?: DynamicFieldValues;
  connectionSettings?: DynamicFieldValues;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.connectionID - The connection's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The response of the deletion operation.
 */
export async function deleteConnection({
  workspace,
  connectionID,
  token,
}: {
  workspace: string;
  connectionID: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.connectionID - The connection's identifier.
 * @param props.ownerID - The new owner ID.
 * @param props.token - Optional token for authentication.
 * @returns The response containing the updated connection.
 */
export async function transferConnection({
  workspace,
  connectionID,
  ownerID,
  token,
}: {
  workspace: string;
  connectionID: string;
  ownerID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Transfer connection ownership using the updated service parameters
  const res = await irminCore.connectionService.transferConnection({
    workspace,
    connectionID,
    newOwner: ownerID,
  });
  return res;
}
