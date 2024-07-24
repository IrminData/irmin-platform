import dictEN from '@/dictionaries/en.json';
import dictFI from '@/dictionaries/fi.json';

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
 * Get the dictionary for a given language
 * @param {Locale} lang - The language to get the dictionary for
 * @returns {Dictionary} dictionary - The dictionary for the given language
 */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang] || dictionaries[defaultLocale];
}

/**
 * Detect the locale from a given URL
 * @param {string} url - The URL to detect the locale from
 * @returns {Locale | null} detectedLocale - The detected locale or null if not found
 */
export function detectLocaleFromURL(url: string): Locale | null {
  const parsedUrl = new URL(url);
  const pathSegments = parsedUrl.pathname.split('/');
  const detectedLocale = pathSegments[1] as Locale;

  if (languages.some((lang) => lang.code === detectedLocale)) {
    return detectedLocale;
  }

  return null;
}
