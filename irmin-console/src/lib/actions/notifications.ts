'use server';

import { Novu } from '@novu/node';

import { defaultLocale, Locale } from '@/lib/dict';

import { User } from '@/types/core/User';

const novuSecret = process.env.NOVU_SECRET_KEY ?? '';
const novu = new Novu(novuSecret);

/**
 * Server action to register a user as a subscriber in Novu with the given locale and user object
 */
export async function registerNovuSubscriber(user: User, locale: Locale) {
  if (!user.clerk_id) return;
  await novu.subscribers.identify(user.clerk_id, {
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    avatar: user.profile_picture,
    locale: locale ?? defaultLocale,
  });
}
