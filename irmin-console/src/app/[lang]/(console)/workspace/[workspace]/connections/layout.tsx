import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

/**
 * SEO metadata for the Connections pages
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Connections | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Connections pages in the Console
 */
export default function ConsoleConnectionsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return children;
}
