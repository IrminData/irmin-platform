'use server';

import { currentUser } from '@clerk/nextjs/server';

import { registerNovuSubscriber } from '@/lib/actions/notifications';
import { initCore } from '@/lib/initCore';
import { initDict } from '@/lib/initDict';

import { User } from '@/types/core/User';

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
  const clerkUser = await currentUser();
  // Get the profile
  const res = await irminCore.profileService.getProfile();
  let profile: User | undefined;
  if (res.data && clerkUser) {
    // Construct the profile object
    profile = {
      ...res.data,
      first_name: res.data.first_name ?? clerkUser.firstName,
      last_name: res.data.last_name ?? clerkUser.lastName,
      email: res.data.email ?? clerkUser.primaryEmailAddress,
      phone: res.data.phone ?? clerkUser.primaryPhoneNumber,
      profile_picture:
        res.data.profile_picture ?? clerkUser.imageUrl ?? undefined,
      clerk_id: clerkUser.id,
    };
    // Register the user as a subscriber in Novu
    await registerNovuSubscriber(profile, locale);
    // Return the profile
    return profile;
  }
  throw new Error('Failed to get profile');
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
 * @param avatar - (optional) User's new profile picture
 *
 * @returns The updated user's profile API response
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
  // Update the profile
  const res = await irminCore.profileService.updateProfile(
    first_name,
    last_name,
    email,
    phone,
    company,
    avatar
  );
  // Register the user as a subscriber in Novu
  await registerNovuSubscriber(res.data, locale);
  return res;
}
