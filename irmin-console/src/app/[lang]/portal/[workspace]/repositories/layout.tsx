import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

/**
 * SEO metadata for the Repositories pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Repositories | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Repositories pages in the Portal
 */
export default function PortalRepositoriesLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return children;
}
