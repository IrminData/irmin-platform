import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

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
    title: `Workflows | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Workflows pages in the Portal
 */
export default function PortalWorkflowsLayout({
  params,
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return (
    <WorkflowsLayoutWrapper params={params}>{children}</WorkflowsLayoutWrapper>
  );
}
