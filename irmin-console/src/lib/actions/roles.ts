'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all avaliable roles
 */
export async function getRoles(token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the roles
  const roles = await irminCore.roleService.fetchRoles();
  return roles.data;
}
