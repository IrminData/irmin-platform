import type { Locale } from '@/lib/dict';

import WebsiteError from '@/components/WebsiteError';

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
