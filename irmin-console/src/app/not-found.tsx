import { Locale } from '@/lib/dict';

import WebsiteError from '@/components/WebsiteError';

/**
 * The page component for the 404 Not Found page
 */
export default async function NotFound(_: {
  params: Promise<{ lang: Locale }>;
}) {
  return <WebsiteError pageNotFound={true} />;
}
