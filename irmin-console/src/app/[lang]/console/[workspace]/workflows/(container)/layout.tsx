import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import WorkflowsLayoutWrapper from '@/components/workflow/WorkflowsLayoutWrapper';

/**
 * SEO metadata for the Workflows pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workflows | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Workflows pages in the Console
 */
export default function ConsoleWorkflowsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return <WorkflowsLayoutWrapper>{children}</WorkflowsLayoutWrapper>;
}
