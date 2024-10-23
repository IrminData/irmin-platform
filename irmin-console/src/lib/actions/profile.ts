'use server';

import { registerNovuSubscriber } from '@/lib/actions/notifications';
import { initCore } from '@/lib/initCore';
import { initDict } from '@/lib/initDict';

/**
 * Server action to get the profile for the current user.
 *
 * This action will also register the user as a subscriber in Novu.
 *
 * @returns The user's profile API response
 */
export async function getProfile() {
  const { locale } = await initDict();
  const irminCore = await initCore();
  // Get the profile
  const res = await irminCore.profileService.getProfile();
  // Register the user as a subscriber in Novu
  await registerNovuSubscriber(res.data, locale);
  return res;
}

/**
 * Server action to update the profile for the current user.
 *
 * This action will also register the user as a subscriber in Novu.
 *
 * @param first_name - (optional) User's new first name
 * @param last_name - (optional) User's new last name
 * @param company - (optional) User's new company name
 * @param profile_picture - (optional) User's new profile picture
 *
 * @returns The updated user's profile API response
 */
export async function updateProfile(
  first_name?: string,
  last_name?: string,
  company?: string,
  profile_picture?: Blob
) {
  const { locale } = await initDict();
  const irminCore = await initCore();
  // Update the profile
  const res = await irminCore.profileService.updateProfile(
    first_name,
    last_name,
    company,
    profile_picture
  );
  // Register the user as a subscriber in Novu
  await registerNovuSubscriber(res.data, locale);
  return res;
}
