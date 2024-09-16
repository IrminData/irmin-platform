import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

/**
 * SEO metadata for the Connections pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Connections | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Connections pages in the Portal
 */
export default function PortalConnectionsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return children;
}
