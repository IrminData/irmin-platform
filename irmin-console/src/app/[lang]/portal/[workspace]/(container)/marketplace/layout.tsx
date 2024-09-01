import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

import PortalMarketplaceLayoutWrapper from '@/components/marketplace/PortalMarketplaceLayoutWrapper';

/**
 * SEO metadata for the Marketplace layout
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
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
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return (
    <PortalMarketplaceLayoutWrapper params={params}>
      {children}
    </PortalMarketplaceLayoutWrapper>
  );
}
