import type { Dictionary } from '@/lib/dict';
import { getDictionary } from '@/lib/dict';

/**
 * Return the dictionary for a given locale from server contexts
 * (`generateMetadata`, server components, route handlers).
 *
 * Thin wrapper around {@link getDictionary} that keeps the import graph
 * tidy: metadata modules pull this instead of the full dict index so any
 * future server-only utilities can live alongside it without leaking into
 * client bundles.
 *
 * @param lang - The route's `[lang]` param.
 * @returns The resolved dictionary (always defined; defaults to English).
 */
export function getServerDict(lang: string): Dictionary {
  return getDictionary(lang);
}
