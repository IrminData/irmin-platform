import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';
import { defaultLocale, getDictionary } from '@/lib/dict';
import { ROBOTS_CONSOLE } from '@/lib/metadata';

import WebsiteError from '@/components/WebsiteError';

/**
 * Next.js does NOT run `generateMetadata` from `not-found.tsx` — only
 * `layout.tsx`, `page.tsx`, and `route.ts` participate in metadata
 * generation. A function export here would be silently ignored, dropping
 * the 404 tab title back to the root layout's bare `"Irmin"` default.
 *
 * We therefore export a static `metadata` object. That means the title
 * can't be localized at request time the way other pages are, so we use
 * the default-locale string at module load; the page body itself still
 * renders localized copy via the `lang` param below. Flows through the
 * root layout's `"%s · Irmin"` template → "Page not found · Irmin".
 */
export const metadata: Metadata = {
  title: getDictionary(defaultLocale).metadata.error.notFoundTitle,
  robots: ROBOTS_CONSOLE,
};

/**
 * The page component for the 404 Not Found page
 */
export default async function NotFound(props: {
  params: Promise<{ lang?: Locale }>;
}) {
  const params = await props.params;
  const lang = params?.lang ?? 'en';
  return <WebsiteError pageNotFound={true} locale={lang} />;
}
