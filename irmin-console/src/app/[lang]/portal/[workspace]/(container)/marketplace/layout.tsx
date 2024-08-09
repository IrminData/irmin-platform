import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import PortalMarketplaceLayoutWrapper from '@/components/marketplace/PortalMarketplaceLayoutWrapper';

/**
 * URL parameters for the Marketplace layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type MarkatplaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Marketplace layout
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Marketplace | IRMIN Portal`,
  };
}

/**
 * Layout for the Marketplace pages in the Portal
 */
export default function PortalMarketplaceLayout({
  params,
  children,
}: Readonly<{
  params: MarkatplaceLayoutParams;
  children: React.ReactNode;
}>) {
  return (
    <PortalMarketplaceLayoutWrapper params={params}>
      {children}
    </PortalMarketplaceLayoutWrapper>
  );
}
