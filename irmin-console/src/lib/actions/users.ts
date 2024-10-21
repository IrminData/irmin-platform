'use server';

import { initCore } from '@/lib/initCore';

import { IrminRoleNames } from '@/types/core/IrminRole';

/**
 * Server action to get all users in the current workspace
 */
export async function getUsers() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the users
  const users = await irminCore.userService.fetchWorkspaceUsers();
  return users.data;
}

/**
 * Server action to delete a user from the workspace
 */
export async function deleteUser(userID: string) {
  const irminCore = await initCore();
  const res = await irminCore.userService.removeUserFromWorkspace(userID);
  return res;
}

/**
 * Server action to change the role of a user in the workspace
 */
export async function changeUserRole(userID: string, role: IrminRoleNames) {
  const irminCore = await initCore();
  const res = await irminCore.userService.changeUserRole(userID, role);
  return res;
}
