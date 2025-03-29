'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to list all stored queries in a workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional user token.
 * @returns The list of stored queries.
 */
export async function getStoredQueries(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.listStoredQueries({ workspace });
  return res.data;
}

/**
 * Server action to get a stored query by its ID.
 *
 * @param workspace - The workspace slug.
 * @param queryID - The stored query's ID.
 * @param token - Optional user token.
 * @returns The stored query.
 */
export async function getStoredQuery(
  workspace: string,
  queryID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.getStoredQuery({
    workspace,
    queryID,
  });
  return res.data;
}

/**
 * Server action to create a new stored query.
 *
 * @param workspace - The workspace slug.
 * @param name - The name of the query.
 * @param description - The description of the query.
 * @param sql - The SQL statement for the query.
 * @param token - Optional user token.
 * @returns The created stored query.
 */
export async function createStoredQuery(
  workspace: string,
  name: string,
  description: string,
  sql: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.createStoredQuery({
    workspace,
    name,
    description,
    sql,
  });
  return res.data;
}

/**
 * Server action to update an existing stored query.
 *
 * @param workspace - The workspace slug.
 * @param queryID - The stored query's ID.
 * @param name - The new name of the query.
 * @param description - The new description of the query.
 * @param sql - The new SQL statement.
 * @param token - Optional user token.
 * @returns The updated stored query.
 */
export async function updateStoredQuery(
  workspace: string,
  queryID: string,
  name: string,
  description: string,
  sql: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.updateStoredQuery({
    workspace,
    queryID,
    name,
    description,
    sql,
  });
  return res.data;
}

/**
 * Server action to delete a stored query.
 *
 * @param workspace - The workspace slug.
 * @param queryID - The stored query's ID.
 * @param token - Optional user token.
 * @returns The API response for deletion.
 */
export async function deleteStoredQuery(
  workspace: string,
  queryID: string,
  token?: string
) {
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
 * @param workspace - The workspace slug.
 * @param queryID - The stored query's ID.
 * @param newOwnerID - The new owner's ID.
 * @param token - Optional user token.
 * @returns The stored query with updated ownership.
 */
export async function transferStoredQuery(
  workspace: string,
  queryID: string,
  newOwnerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.transferStoredQuery({
    workspace,
    queryID,
    newOwnerID,
  });
  return res.data;
}

/**
 * Server action to execute a stored query.
 *
 * @param workspace - The workspace slug.
 * @param queryID - The stored query's ID.
 * @param token - Optional user token.
 * @returns The result rows of the executed query.
 */
export async function executeStoredQuery(
  workspace: string,
  queryID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeStoredQuery({
    workspace,
    queryID,
  });
  return res.data;
}

/**
 * Server action to execute an arbitrary SQL statement.
 *
 * @param workspace - The workspace slug.
 * @param sql - The SQL statement to execute.
 * @param token - Optional user token.
 * @returns The result rows.
 */
export async function executeSQL(
  workspace: string,
  sql: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeSQL({ workspace, sql });
  return res.data;
}
