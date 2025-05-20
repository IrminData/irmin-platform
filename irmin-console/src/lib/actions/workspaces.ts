'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get all workspaces for the current user.
 *
 * @param props - The properties for the function.
 * @param props.token - Optional token for authentication.
 * @returns The list of workspaces.
 */
export async function getWorkspaces({ token }: { token?: string }) {
  const irminCore = await initCore(token);
  const workspaces = await irminCore.workspaceService.fetchWorkspaces();
  return workspaces;
}
