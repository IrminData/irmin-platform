'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the profile for the current user.
 */
export async function getProfile() {
  const irminCore = await initCore();
  const res = await irminCore.profileService.getProfile();
  return res;
}
