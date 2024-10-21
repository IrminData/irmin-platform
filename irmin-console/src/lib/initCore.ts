'use server';

import { cookies, headers } from 'next/headers';

import { auth } from '@clerk/nextjs/server';

import IrminCore from '@/lib/core';
import { defaultLocale, findLocale } from '@/lib/dict';

/**
 * Initialize the IrminCore instance for the current user and locale on the server side.
 */
export async function initCore() {
  // Get the user and token
  const { userId, getToken } = auth();
  if (!userId) throw new Error('User not signed in');
  const token = await getToken({
    template: 'irmin-core',
  });
  if (!token) throw new Error('Failed to get token');
  // Get the locale from the cookie or the Accept-Language header
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const headersList = headers();
  const localeHeader = headersList.get('accept-language');
  const locale = findLocale(localeCookie || localeHeader || defaultLocale);
  // Create the IrminCore instance
  const irminCore = new IrminCore(locale, token);
  return irminCore;
}
