import { getDict } from '@/lib/actions/dict';
import { Locale } from '@/lib/dict';

import WebsiteError from '@/components/WebsiteError';

/**
 * The page component for the 404 Not Found page
 */
export default async function NotFound(_: {
  params: Promise<{ lang: Locale }>;
}) {
  const { dict } = await getDict();
  return <WebsiteError pageNotFound={true} dict={dict} />;
}
