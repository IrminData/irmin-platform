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

/**
 * Fetch a single workspace by slug.
 *
 * @param props - The properties for the function.
 * @param props.workspaceSlug - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The workspace details.
 */
export async function getWorkspace({
  workspaceSlug,
  token,
}: {
  workspaceSlug: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const workspace = await irminCore.workspaceService.fetchWorkspace({
    workspaceSlug,
  });
  return workspace;
}
