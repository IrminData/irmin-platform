'use server';

import { initCore } from '@/lib/initCore';

import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get all workspaces for the current user.
 */
export async function getWorkspaces(token?: string) {
  const irminCore = await initCore(token);
  const workspaces = await irminCore.workspaceService.fetchWorkspaces();
  return workspaces.data;
}

/**
 * Server action to fetch a single workspace by slug.
 */
export async function getWorkspace(workspaceSlug: string, token?: string) {
  const irminCore = await initCore(token);
  const workspace =
    await irminCore.workspaceService.fetchWorkspace(workspaceSlug);
  return workspace.data;
}

/**
 * Server action to delete a workspace.
 */
export async function deleteWorkspace(workspaceSlug: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.deleteWorkspace(workspaceSlug);
  return res;
}

/**
 * Server action to delete a workspace.
 */
export async function reassignWorkspace(
  workspaceSlug: string,
  newOwnerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.transferWorkspaceOwnership(
    workspaceSlug,
    newOwnerID
  );
  return res;
}

/**
 * Server action to update a workspace.
 */
export async function updateWorkspace(
  workspaceSlug: string,
  data: ItemUpdateProps,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.updateWorkspace(
    workspaceSlug,
    data
  );
  return res;
}

/**
 * Server action to create a new workspace.
 */
export async function createWorkspace(
  name: string,
  description: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.createWorkspace(
    name,
    description
  );
  return res;
}

/**
 * Server action to switch the current workspace.
 */
export async function switchWorkspace(workspaceSlug?: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.switchWorkspace(
    workspaceSlug ?? ''
  );
  return res;
}

/**
 * Server action to leave a workspace.
 */
export async function leaveWorkspace(workspaceSlug?: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.leaveWorkspace(
    workspaceSlug ?? ''
  );
  return res;
}
