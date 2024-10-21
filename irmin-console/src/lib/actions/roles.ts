'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all avaliable roles
 */
export async function getRoles() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the roles
  const roles = await irminCore.roleService.fetchRoles();
  return roles.data;
}
