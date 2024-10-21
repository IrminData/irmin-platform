'use server';

import { cookies, headers } from 'next/headers';

import { defaultLocale, findLocale, getDictionary } from '@/lib/dict';

/**
 * Get the locale and dictionary on the server side.
 */
export async function initDict() {
  // Get the locale from the cookie or the Accept-Language header
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const headersList = headers();
  const localeHeader = headersList.get('accept-language');
  // Get the locale and the dictionary
  const locale = findLocale(localeCookie || localeHeader || defaultLocale);
  const dict = getDictionary(locale);
  return {
    locale,
    dict,
  };
}
