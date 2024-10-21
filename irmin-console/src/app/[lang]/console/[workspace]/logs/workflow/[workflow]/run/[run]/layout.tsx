import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Workflow Run Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The slug of the workflow to show logs for
 * @param run - The ID of the workflow run to show logs for
 */
export type WorkflowRunLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
  run: string;
};

/**
 * SEO metadata for the Workflow Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedWorkflow = params.workflow.replace(/-/g, ' ');
  return {
    title: `Workflow run ${params.run} ${formattedWorkflow} logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Workflow Run Logs pages in the Console
 * @param children - The children to render
 */
export default function WorkflowRunLogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  params: WorkflowRunLogsLayoutParams;
}>) {
  return children;
}
