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
export async function getProfile(token?: string) {
  const { locale } = await initDict();
  const irminCore = await initCore(token);
  // Get the profile
  const res = await irminCore.profileService.getProfile();
  if (res.data) {
    // Register the user as a subscriber in Novu
    await registerNovuSubscriber(res.data, locale);
  }
  return res;
}

/**
 * Server action to update the profile for the current user.
 *
 * This action will also register the user as a subscriber in Novu.
 *
 * @param first_name - (optional) User's new first name
 * @param last_name - (optional) User's new last name
 * @param email - (optional) User's new email
 * @param phone - (optional) User's new phone number
 * @param company - (optional) User's new company name
 * @param profile_picture - (optional) User's new profile picture
 *
 * @returns The updated user's profile API response
 */
export async function updateProfile(
  first_name?: string,
  last_name?: string,
  email?: string,
  phone?: string,
  company?: string,
  profile_picture?: File,
  token?: string
) {
  const { locale } = await initDict();
  const irminCore = await initCore(token);
  // Update the profile
  const res = await irminCore.profileService.updateProfile(
    first_name,
    last_name,
    email,
    phone,
    company,
    profile_picture
  );
  // Register the user as a subscriber in Novu
  await registerNovuSubscriber(res.data, locale);
  return res;
}
