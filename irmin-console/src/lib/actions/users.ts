'use server';

import { initCore } from '@/lib/initCore';

import { IrminRole } from '@/types/core/IrminRole';

/**
 * Server action to get all users in a workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional user token.
 * @returns The list of workspace users.
 */
export async function getUsers(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  // Get the users using the fetchWorkspaceUsers method
  const users = await irminCore.userService.fetchWorkspaceUsers({ workspace });
  return users.data;
}

/**
 * Server action to get a single user.
 *
 * @param workspace - The workspace slug.
 * @param userID - The user ID.
 * @param token - Optional user token.
 * @returns The user details.
 */
export async function getUser(
  workspace: string,
  userID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the user using the fetchUser method
  const userResponse = await irminCore.userService.fetchUser({
    workspace,
    user: userID,
  });
  return userResponse.data;
}

/**
 * Server action to delete a user from a workspace.
 *
 * @param workspace - The workspace slug.
 * @param userID - The user ID to remove.
 * @param token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteUser(
  workspace: string,
  userID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Remove the user using the removeUserFromWorkspace method
  const res = await irminCore.userService.removeUserFromWorkspace({
    workspace,
    user: userID,
  });
  return res;
}

/**
 * Server action to change the roles of a user in a workspace.
 *
 * - workspace: The workspace slug.
 * - userID: The user ID.
 * - roles: An array of new roles.
 *
 * @param workspace - The workspace slug.
 * @param userID - The user ID.
 * @param roles - The new roles to assign to the user.
 * @param token - Optional user token.
 * @returns The updated user.
 */
export async function changeUserRole(
  workspace: string,
  userID: string,
  roles: IrminRole[],
  token?: string
) {
  const irminCore = await initCore(token);
  // Change the user's roles using the changeUserRole method
  const res = await irminCore.userService.changeUserRole({
    workspace,
    user: userID,
    roles,
  });
  return res;
}
