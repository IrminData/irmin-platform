import type { Metadata } from 'next';

import WebsiteFooter from '@/components/website/footer/WebsiteFooter';
import WebsiteNavigation from '@/components/website/navigation/WebsiteNavigation';

/**
 * Default layout level metadata for SEO on the website
 */
export const metadata: Metadata = {
  title: 'Just like GitHub for Data, made for developers | IRMIN',
  description:
    'Tired of scattered data? Sync, analyse & manage your data with AI in minutes. Use connectors, marketplace & run actions.',
  openGraph: {
    type: 'website',
  },
};

/**
 * Website layout (Website)
 *
 * @remarks
 * This layout is used for all pages on the website.
 * It includes the navigation and footer components.
 *
 * Website pages are:
 * - Auth pages
 * - Wordpress pages
 * - Wordpress posts
 * - Everything within the `src/[lang]/(website)` directory
 *
 * @param props - Children to render
 */
export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex flex-col'>
      <WebsiteNavigation />
      {children}
      <WebsiteFooter />
    </div>
  );
}
