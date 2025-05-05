'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all users in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional user token.
 * @returns The list of workspace users.
 */
export async function getUsers({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the users using the fetchWorkspaceUsers method
  const users = await irminCore.userService.fetchWorkspaceUsers({ workspace });
  return users;
}

/**
 * Server action to get a single user by ID.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.userID - The user ID.
 * @param props.token - Optional user token.
 * @returns The user object.
 */
export async function getUser({
  workspace,
  userID,
  token,
}: {
  workspace: string;
  userID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the user using the fetchUser method
  const user = await irminCore.userService.fetchUser({
    workspace,
    user: userID,
  });
  return user;
}
