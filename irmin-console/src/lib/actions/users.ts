'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all users in the current workspace
 */
export async function getUsers(token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the users
  const users = await irminCore.userService.fetchWorkspaceUsers();
  return users.data;
}

/**
 * Server action to get a single user
 */
export async function getUser(userID: string, token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the users
  const users = await irminCore.userService.fetchUser(userID);
  return users.data;
}

/**
 * Server action to delete a user from the workspace
 */
export async function deleteUser(userID: string, token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.userService.removeUserFromWorkspace(userID);
  return res;
}

/**
 * Server action to change the role of a user in the workspace
 */
export async function changeUserRole(
  userID: string,
  roles: string[],
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.userService.changeUserRole(userID, roles);
  return res;
}
