'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get all workspaces for the current user.
 *
 * - token: Optional token for authentication.
 *
 * @returns The list of workspaces.
 */
export async function getWorkspaces(token?: string) {
  const irminCore = await initCore(token);
  const workspaces = await irminCore.workspaceService.fetchWorkspaces();
  return workspaces.data;
}

/**
 * Fetch a single workspace by slug.
 *
 * - workspaceSlug: The workspace slug.
 * - token: Optional token for authentication.
 *
 * @returns The workspace details.
 */
export async function getWorkspace(workspaceSlug: string, token?: string) {
  const irminCore = await initCore(token);
  const workspace = await irminCore.workspaceService.fetchWorkspace({
    workspaceSlug,
  });
  return workspace.data;
}

/**
 * Delete a workspace.
 *
 * - workspaceSlug: The workspace slug.
 * - token: Optional token for authentication.
 *
 * @returns The deletion result.
 */
export async function deleteWorkspace(workspaceSlug: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.deleteWorkspace({
    workspace: workspaceSlug,
  });
  return res;
}

/**
 * Transfer a workspace to a new owner.
 *
 * - workspaceSlug: The workspace slug.
 * - newOwnerID: The new owner's ID.
 * - token: Optional token for authentication.
 *
 * @returns The updated workspace.
 */
export async function transferWorkspace(
  workspaceSlug: string,
  newOwnerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.transferWorkspace({
    workspace: workspaceSlug,
    newOwnerID,
  });
  return res;
}

/**
 * Update a workspace.
 *
 * - workspaceSlug: The workspace slug.
 * - data: The updated workspace data (e.g. name, description).
 * - token: Optional token for authentication.
 *
 * @returns The updated workspace.
 */
export async function updateWorkspace(
  workspaceSlug: string,
  name?: string,
  description?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.updateWorkspace({
    workspace: workspaceSlug,
    data: {
      name,
      description,
    },
  });
  return res;
}

/**
 * Create a new workspace.
 *
 * - name: The workspace name.
 * - description: The workspace description.
 * - token: Optional token for authentication.
 *
 * @returns The created workspace.
 */
export async function createWorkspace(
  name: string,
  description: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.createWorkspace({
    name,
    description,
  });
  return res;
}

/**
 * Leave a workspace.
 *
 * - workspaceSlug: The workspace slug.
 * - token: Optional token for authentication.
 *
 * @returns The result of the leave operation.
 */
export async function leaveWorkspace(workspaceSlug: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.leaveWorkspace({
    workspaceSlug,
  });
  return res;
}
