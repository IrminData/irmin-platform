import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

/**
 * SEO metadata for the Workspace Settings pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workspace Settings | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Workspace Settings pages in the Console
 */
export default function ConsoleWorkspaceSettingsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return <div className='container relative mx-auto max-w-6xl'>{children}</div>;
}
