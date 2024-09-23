import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

import LogsLayoutWrapper from '@/components/logs/LogsLayoutWrapper';

/**
 * SEO metadata for the Logs pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Logs | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Logs pages in the Portal
 */
export default function PortalLogsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return <LogsLayoutWrapper>{children}</LogsLayoutWrapper>;
}
