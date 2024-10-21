'use server';

import { initDict } from '@/lib/initDict';

/**
 * Server action to the current dictionary and locale.
 */
export async function getDict() {
  const { dict, locale } = await initDict();
  return {
    dict,
    locale,
  };
}
