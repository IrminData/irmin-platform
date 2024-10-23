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

/**
 * Server action to update the profile for the current user.
 *
 * @param first_name - (optional) User's new first name
 * @param last_name - (optional) User's new last name
 * @param company - (optional) User's new company name
 * @param profile_picture - (optional) User's new profile picture
 */
export async function updateProfile(
  first_name?: string,
  last_name?: string,
  company?: string,
  profile_picture?: Blob
) {
  const irminCore = await initCore();
  const res = await irminCore.profileService.updateProfile(
    first_name,
    last_name,
    company,
    profile_picture
  );
  return res;
}
