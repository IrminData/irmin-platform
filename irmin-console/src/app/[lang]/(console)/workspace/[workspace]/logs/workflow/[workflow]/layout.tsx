import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Workflow Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The slug of the workflow to show logs for
 */
export type WorkflowLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

/**
 * SEO metadata for the Workflow Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedWorkflow = params.workflow.replace(/-/g, ' ');
  return {
    title: `Workflow ${formattedWorkflow} logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Workflow Logs pages in the Console
 */
export default async function WorkflowLogsLayout(props: {
  params: Promise<WorkflowLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
