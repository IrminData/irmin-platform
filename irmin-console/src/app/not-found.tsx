import { dictionaries, Locale } from '@/dictionaries';

import WebsiteFooter from '@/components/website/footer/WebsiteFooter';
import WebsiteNavigation from '@/components/website/navigation/WebsiteNavigation';
import WebsiteError from '@/components/website/websiteError';

/**
 * The page component for the 404 Not Found page
 */
export default async function NotFound(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  return (
    <>
      <WebsiteNavigation />
      <WebsiteError pageNotFound={true} />
      <WebsiteFooter
        locale={params?.lang ?? 'en'}
        dict={dictionaries[params?.lang ?? 'en']}
      />
    </>
  );
}
