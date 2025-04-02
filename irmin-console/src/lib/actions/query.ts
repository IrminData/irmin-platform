'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to list all stored queries in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional user token.
 * @returns The list of stored queries.
 */
export async function getStoredQueries({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.listStoredQueries({ workspace });
  return res;
}

/**
 * Server action to get a stored query by its ID.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.queryID - The stored query's ID.
 * @param props.token - Optional user token.
 * @returns The stored query.
 */
export async function getStoredQuery({
  workspace,
  queryID,
  token,
}: {
  workspace: string;
  queryID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.getStoredQuery({
    workspace,
    queryID,
  });
  return res;
}

/**
 * Server action to create a new stored query.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.name - The name of the query.
 * @param props.description - The description of the query.
 * @param props.sql - The SQL statement for the query.
 * @param props.token - Optional user token.
 * @returns The created stored query.
 */
export async function createStoredQuery({
  workspace,
  name,
  description,
  sql,
  token,
}: {
  workspace: string;
  name: string;
  description: string;
  sql: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.createStoredQuery({
    workspace,
    name,
    description,
    sql,
  });
  return res;
}

/**
 * Server action to update an existing stored query.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.queryID - The stored query's ID.
 * @param props.name - The new name of the query.
 * @param props.description - The new description of the query.
 * @param props.sql - The new SQL statement.
 * @param props.token - Optional user token.
 * @returns The updated stored query.
 */
export async function updateStoredQuery({
  workspace,
  queryID,
  name,
  description,
  sql,
  token,
}: {
  workspace: string;
  queryID: string;
  name: string;
  description: string;
  sql: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.updateStoredQuery({
    workspace,
    queryID,
    name,
    description,
    sql,
  });
  return res;
}

/**
 * Server action to delete a stored query.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.queryID - The stored query's ID.
 * @param props.token - Optional user token.
 * @returns The API response for deletion.
 */
export async function deleteStoredQuery({
  workspace,
  queryID,
  token,
}: {
  workspace: string;
  queryID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.deleteStoredQuery({
    workspace,
    queryID,
  });
  return res;
}

/**
 * Server action to transfer ownership of a stored query.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.queryID - The stored query's ID.
 * @param props.newOwnerID - The new owner's ID.
 * @param props.token - Optional user token.
 * @returns The stored query with updated ownership.
 */
export async function transferStoredQuery({
  workspace,
  queryID,
  newOwnerID,
  token,
}: {
  workspace: string;
  queryID: string;
  newOwnerID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.transferStoredQuery({
    workspace,
    queryID,
    newOwnerID,
  });
  return res;
}

/**
 * Server action to execute a stored query.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.queryID - The stored query's ID.
 * @param props.token - Optional user token.
 * @returns The result rows of the executed query.
 */
export async function executeStoredQuery({
  workspace,
  queryID,
  token,
}: {
  workspace: string;
  queryID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeStoredQuery({
    workspace,
    queryID,
  });
  return res;
}

/**
 * Server action to execute an arbitrary SQL statement.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.sql - The SQL statement to execute.
 * @param props.token - Optional user token.
 * @returns The result rows.
 */
export async function executeSQL({
  workspace,
  sql,
  token,
}: {
  workspace: string;
  sql: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeSQL({ workspace, sql });
  return res;
}
