import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import PortalWorkflowsLayoutWrapper from '@/components/workflow/PortalWorkflowsLayoutWrapper';

/**
 * URL parameters for the Workflows pages
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type WorkflowsLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Workflows pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkflowsLayoutParams;
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
  params: WorkflowsLayoutParams;
  children: React.ReactNode;
}>) {
  return (
    <PortalWorkflowsLayoutWrapper params={params}>
      {children}
    </PortalWorkflowsLayoutWrapper>
  );
}
