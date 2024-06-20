import WebsiteNavigation from '@/components/website/websiteNavigation';
import WebsiteFooter from '@/components/website/websiteFooter';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Irmin',
  description: 'A better home for your data',
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
