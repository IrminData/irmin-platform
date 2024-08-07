import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

/**
 * URL parameters for the Editor layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The ID of the workflow to show logs for
 */
export type WorkflowLogsLayoutParams = {
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
  params: WorkflowLogsLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workflow ${params.workflow ?? ''} logs | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the WorkflowLogs pages in the Portal
 * @param children - The children to render
 * @todo Implement this layout
 */
export default function WorkflowLogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  params: WorkflowLogsLayoutParams;
}>) {
  return <div id='workflow-logs-layout'>{children}</div>;
}
