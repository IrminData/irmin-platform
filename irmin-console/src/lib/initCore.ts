'use server';

import { cookies, headers } from 'next/headers';

import { auth } from '@clerk/nextjs/server';

import IrminCore from '@/lib/core';
import { defaultLocale, findLocale } from '@/lib/dict';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

/**
 * Initialize the IrminCore instance for the current user and locale on the server side.
 */
export async function initCore() {
  // Get the locale from the cookie or the Accept-Language header
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const headersList = headers();
  const localeHeader = headersList.get('accept-language');
  const locale = findLocale(localeCookie || localeHeader || defaultLocale);

  if (isOfflineMode) {
    // Create the IrminCore instance with offline token if in offline mode
    const irminCore = new IrminCore(locale, 'offline');
    return irminCore;
  }

  // Get the user and token
  const { userId, getToken } = await auth();
  if (!userId) throw new Error('User not signed in');
  const token = await getToken({
    template: 'irmin-core',
  });
  if (!token) throw new Error('Failed to get token');

  // Create the IrminCore instance
  const irminCore = new IrminCore(locale, token);
  return irminCore;
}
