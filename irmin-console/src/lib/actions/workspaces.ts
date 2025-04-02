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

/**
 * Delete a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspaceSlug - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The deletion result.
 */
export async function deleteWorkspace({
  workspaceSlug,
  token,
}: {
  workspaceSlug: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.deleteWorkspace({
    workspace: workspaceSlug,
  });
  return res;
}

/**
 * Transfer a workspace to a new owner.
 *
 * @param props - The properties for the function.
 * @param props.workspaceSlug - The workspace slug.
 * @param props.newOwnerID - The new owner's ID.
 * @param props.token - Optional token for authentication.
 * @returns The updated workspace.
 */
export async function transferWorkspace({
  workspaceSlug,
  newOwnerID,
  token,
}: {
  workspaceSlug: string;
  newOwnerID: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspaceSlug - The workspace slug.
 * @param props.name - The updated workspace name.
 * @param props.description - The updated workspace description.
 * @param props.token - Optional token for authentication.
 * @returns The updated workspace.
 */
export async function updateWorkspace({
  workspaceSlug,
  name,
  description,
  token,
}: {
  workspaceSlug: string;
  name?: string;
  description?: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.updateWorkspace({
    workspace: workspaceSlug,
    data: { name, description },
  });
  return res;
}

/**
 * Create a new workspace.
 *
 * @param props - The properties for the function.
 * @param props.name - The workspace name.
 * @param props.description - The workspace description.
 * @param props.token - Optional token for authentication.
 * @returns The created workspace.
 */
export async function createWorkspace({
  name,
  description,
  token,
}: {
  name: string;
  description: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspaceSlug - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The result of the leave operation.
 */
export async function leaveWorkspace({
  workspaceSlug,
  token,
}: {
  workspaceSlug: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.workspaceService.leaveWorkspace({
    workspaceSlug,
  });
  return res;
}
