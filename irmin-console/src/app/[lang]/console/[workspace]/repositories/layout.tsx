import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

/**
 * SEO metadata for the Repositories pages
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Repositories | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Repositories pages in the Console
 */
export default function ConsoleRepositoriesLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return children;
}
