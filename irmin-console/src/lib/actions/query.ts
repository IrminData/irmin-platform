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
