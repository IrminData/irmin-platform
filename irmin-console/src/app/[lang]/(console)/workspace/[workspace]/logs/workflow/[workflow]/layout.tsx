import type { Metadata } from 'next';

import { fetchWorkflowMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Workflow Logs layout
 */
export type WorkflowLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

export async function generateMetadata(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, workflow } = await props.params;
  const wf = await fetchWorkflowMeta(lang, workspace, workflow);
  return { title: wf?.name ?? `${workflow.slice(0, 8)}…` };
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
