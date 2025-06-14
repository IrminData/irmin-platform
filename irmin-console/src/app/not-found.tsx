import { Locale } from '@/lib/dict';

import WebsiteError from '@/components/WebsiteError';

/**
 * The page component for the 404 Not Found page
 */
export default async function NotFound({
  params,
}: {
  params: Promise<{ lang: Locale | undefined }>;
}) {
  const { lang } = await params;
  if (!lang) {
    return <WebsiteError pageNotFound={true} locale='en' />;
  }
  return <WebsiteError pageNotFound={true} locale={lang} />;
}
