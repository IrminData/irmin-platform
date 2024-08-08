import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

/**
 * URL parameters for the Editor layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The ID of the workflow to show logs for
 */
export type ActionWorkflowLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

/**
 * SEO metadata for the Editor layout
 */
export async function generateMetadata({
  params,
}: {
  params: ActionWorkflowLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Action Workflow ${params.workflow ?? ''} | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the ActionWorkflow pages in the Portal
 * @todo Implement this layout
 */
export default function ActionWorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  params: ActionWorkflowLayoutParams;
}>) {
  return <div id='export-workflow-layout'>{children}</div>;
}
