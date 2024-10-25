'use server';

import { cookies, headers } from 'next/headers';

import IrminCore from '@/lib/core';
import { defaultLocale, findLocale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

/**
 * Initialize the IrminCore instance for the current user and locale on the server side.
 */
export async function initCore(apiToken?: string): Promise<IrminCore> {
  // Get the locale from the cookie or the Accept-Language header
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const headersList = await headers();
  const localeHeader = headersList.get('accept-language');
  const locale = findLocale(localeCookie || localeHeader || defaultLocale);

  // Get the token
  const token = apiToken ?? (await getToken());

  // Create the IrminCore instance
  const irminCore = new IrminCore(locale, token);
  return irminCore;
}
