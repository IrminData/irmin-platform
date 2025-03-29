'use server';

import { registerNovuSubscriber } from '@/lib/actions/notifications';
import { initCore } from '@/lib/initCore';
import { initDict } from '@/lib/initDict';

/**
 * Server action to get the profile for the current user.
 *
 * This action also registers the user as a subscriber in Novu.
 *
 * @param token - (Optional) User's API token.
 * @returns The current user's profile.
 */
export async function getProfile(token?: string) {
  const { locale } = await initDict();
  const irminCore = await initCore(token);
  // Get the profile from the API
  const res = await irminCore.profileService.getProfile();
  if (res.data) {
    const profile = res.data;
    // Register the user as a subscriber in Novu
    await registerNovuSubscriber(res.data, locale);
    return profile;
  }
  throw new Error('Failed to get profile');
}

/**
 * Server action to update the profile for the current user.
 *
 * This action also registers the user as a subscriber in Novu.
 *
 * @param first_name - User's new first name.
 * @param last_name - User's new last name.
 * @param email - User's new email.
 * @param phone - User's new phone number.
 * @param company - User's new company name.
 * @param avatar - (Optional) User's new profile picture.
 * @param token - (Optional) User's API token.
 * @returns The updated user's profile.
 */
export async function updateProfile(
  first_name?: string,
  last_name?: string,
  email?: string,
  phone?: string,
  company?: string,
  avatar?: File | Blob,
  token?: string
) {
  const { locale } = await initDict();
  const irminCore = await initCore(token);
  // Update the profile using the service method
  const res = await irminCore.profileService.updateProfile({
    first_name,
    last_name,
    email,
    phone,
    company,
    avatar,
  });
  if (!res.data) return null;
  // Register the updated user as a subscriber in Novu
  await registerNovuSubscriber(res.data, locale);
  return res;
}
