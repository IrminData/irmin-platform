'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all available roles.
 *
 * @param props.token - Optional user token.
 * @returns The list of roles.
 */
export async function getRoles({ token }: { token?: string }) {
  const irminCore = await initCore(token);
  // Get the roles
  const roles = await irminCore.roleService.fetchRoles();
  return roles;
}
