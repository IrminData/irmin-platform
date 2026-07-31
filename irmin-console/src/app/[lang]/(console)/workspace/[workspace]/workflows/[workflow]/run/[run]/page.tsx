import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';
import { getServerDict } from '@/lib/dict/server';

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

export async function generateMetadata(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, run } = await props.params;
  const dict = getServerDict(lang);
  // Truncate run id — a raw 36-char UUID in the tab title blows past the
  // 60-char budget before the workflow + workspace suffix is even added.
  const runShort = run.slice(0, 8);
  return { title: `${dict.metadata.resource.run} ${runShort}` };
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
