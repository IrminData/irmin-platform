import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import PortalMarketplaceLayoutWrapper from '@/components/marketplace/PortalMarketplaceLayoutWrapper';

/**
 * URL parameters for the Marketplace layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type MarketplaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Marketplace layout
 */
export async function generateMetadata({
  params,
}: {
  params: MarketplaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Marketplace | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Marketplace pages in the Portal
 */
export default function PortalMarketplaceLayout({
  params,
  children,
}: Readonly<{
  params: MarketplaceLayoutParams;
  children: React.ReactNode;
}>) {
  return (
    <PortalMarketplaceLayoutWrapper params={params}>
      {children}
    </PortalMarketplaceLayoutWrapper>
  );
}
