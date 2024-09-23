import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

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
    title: `Logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Logs pages in the Console
 */
export default function ConsoleLogsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return <LogsLayoutWrapper>{children}</LogsLayoutWrapper>;
}
