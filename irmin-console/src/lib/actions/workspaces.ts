'use server';

import { initCore } from '@/lib/initCore';

import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get all workspaces for the current user.
 */
export async function getWorkspaces() {
  const irminCore = await initCore();
  const workspaces = await irminCore.workspaceService.fetchWorkspaces();
  return workspaces.data;
}

/**
 * Server action to fetch a single workspace by slug.
 */
export async function getWorkspace(workspaceSlug: string) {
  const irminCore = await initCore();
  const workspace =
    await irminCore.workspaceService.fetchWorkspace(workspaceSlug);
  return workspace.data;
}

/**
 * Server action to delete a workspace.
 */
export async function deleteWorkspace(workspaceSlug: string) {
  const irminCore = await initCore();
  // Make sure we are in the correct workspace
  await irminCore.workspaceService.switchWorkspace(workspaceSlug);
  // Delete the workspace
  const res = await irminCore.workspaceService.deleteWorkspace();
  return res;
}

/**
 * Server action to delete a workspace.
 */
export async function reassignWorkspace(newOwnerID: string) {
  const irminCore = await initCore();
  const res =
    await irminCore.workspaceService.transferWorkspaceOwnership(newOwnerID);
  return res;
}

/**
 * Server action to update a workspace.
 */
export async function updateWorkspace(data: ItemUpdateProps) {
  const irminCore = await initCore();
  const res = await irminCore.workspaceService.updateWorkspace(data);
  return res;
}

/**
 * Server action to create a new workspace.
 *
 * @param name - The name of the new workspace.
 * @param description - The description of the new workspace.
 * @returns The API response from the server.
 */
export async function createWorkspace(name: string, description: string) {
  const irminCore = await initCore();
  const res = await irminCore.workspaceService.createWorkspace(
    name,
    description
  );
  return res;
}

/**
 * Server action to switch the current workspace.
 *
 * @param workspaceSlug - The slug of the workspace to switch to.
 * @returns The API response from the server.
 */
export async function switchWorkspace(workspaceSlug?: string) {
  if (!workspaceSlug) return;
  const irminCore = await initCore();
  const res = await irminCore.workspaceService.switchWorkspace(workspaceSlug);
  return res;
}
