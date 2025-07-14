/**
 * A module for handling dictionaries and languages
 *
 * @remarks
 *
 * This module is used to handle the different languages supported by Irmin
 * and to provide the correct dictionary based on the selected language
 */
import dictEN from '@/lib/dict/en';
import dictFI from '@/lib/dict/fi';

/**
 * A dictionary Type based on the JSON files in the dictionaries folder
 * Uses the English dictionary as the base type
 */
export type Dictionary = typeof dictEN;

/**
 * A type for the supported languages
 * Hardcoded values
 */
export type Locale = 'en' | 'fi';

/**
 * An array of languages supported by Irmin
 * Hardcoded values
 */
export const languages: {
  code: Locale;
  name: string;
  dictionary: Dictionary;
}[] = [
  { code: 'en', name: 'English', dictionary: dictEN },
  { code: 'fi', name: 'Suomi', dictionary: dictFI },
];

/**
 * The default locale
 */
export const defaultLocale: Locale = 'en';

/**
 * A dictionary of dictionaries, where the key is the language code
 */
export const dictionaries = languages
  .map((lang) => ({
    [lang.code]: lang.dictionary,
  }))
  .reduce((acc, cur) => ({ ...acc, ...cur }), {});

/**
 * Find the locale from the language code
 * @param lang - The language code
 * @returns The locale for the given language
 */
export function findLocale(lang: string): Locale {
  return languages.find((l) => l.code === lang)?.code || defaultLocale;
}

/**
 * Get the dictionary for a given language
 * @param lang - The language to get the dictionary for
 * @returns The dictionary for the given language
 */
export function getDictionary(lang: string): Dictionary {
  const locale = findLocale(lang);
  return dictionaries[locale];
}
/**
 * Detect the locale from a given URL
 * @param url - The URL to detect the locale from
 * @returns The detected locale or null if not found
 */
export function detectLocaleFromURL(url: string): Locale | null {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname;

  // Check if the pathname starts with a locale followed by a slash or is exactly a locale
  for (const lang of languages) {
    if (pathname.startsWith(`/${lang.code}/`) || pathname === `/${lang.code}`) {
      return lang.code;
    }
  }

  return null;
}
