import type { Metadata } from 'next';

import WebsiteFooter from '@/components/website/websiteFooter';
import WebsiteNavigation from '@/components/website/websiteNavigation';

export const metadata: Metadata = {
  title: 'Just like GitHub for Data, made for developers | IRMIN',
  description:
    'Tired of scattered data? Sync, analyse & manage your data with AI in minutes. Use connectors, marketplace & run actions.',
  openGraph: {
    type: 'website',
  },
};

export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <WebsiteNavigation />
      {children}
      <WebsiteFooter />
    </>
  );
}
