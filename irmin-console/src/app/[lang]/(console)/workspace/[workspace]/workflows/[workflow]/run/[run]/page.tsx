import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

import WorkflowRunLogsSection from '@/components/workflow/WorkflowRunLogsSection';

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
  return {
    title: `Run logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Workflow Run page - showing logs for a specific workflow run.
 */
export default async function WorkflowRunPage(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}) {
  const params = await props.params;
  return (
    <WorkflowRunLogsSection workflowID={params.workflow} runID={params.run} />
  );
}
