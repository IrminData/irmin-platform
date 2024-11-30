'use server';

import { initCore } from '@/lib/initCore';

import { IrminFileType } from '@/types/core/EditorItems';

/**
 * Server action to execute a script once.
 */
export async function executeScript(
  type: IrminFileType,
  content: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeScript(type, content);
  return res;
}

/**
 * Server action to create a new query.
 */
export async function createQuery(
  type: IrminFileType,
  content: string,
  name?: string,
  description?: string,
  stored?: boolean,
  run?: boolean,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.createQuery(
    type,
    content,
    name,
    description,
    stored,
    run
  );
  return res;
}

/**
 * Server action to get all queries.
 */
export async function getQueries(token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.getQueries();
  return res;
}

/**
 * Server action to get a single query by ID.
 */
export async function getQuery(query: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.getQuery(query);
  return res;
}

/**
 * Server action to delete a query.
 */
export async function deleteQuery(query: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.deleteQuery(query);
  return res;
}

/**
 * Server action to update a query.
 */
export async function updateQuery(
  query: string,
  type?: IrminFileType,
  content?: string,
  name?: string,
  description?: string,
  stored?: boolean,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.updateQuery(
    query,
    type,
    content,
    name,
    description,
    stored
  );
  return res;
}

/**
 * Server action to run a query.
 */
export async function executeQuery(query: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.executeQuery(query);
  return res;
}

/**
 * Server action to get the results of a query.
 */
export async function getQueryResults(
  query: string,
  page: number,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.queryService.getQueryResults(query, page);
  return res;
}
