import type { Metadata } from 'next';

import {
  fetchWorkflowMeta,
  fetchWorkspaceMeta,
} from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import {
  buildTitle,
  buildTitleTemplate,
  clampDescription,
} from '@/lib/metadata';

import WorkflowLayoutWrapper from '@/components/workflow/WorkflowLayoutWrapper';

/**
 * URL parameters for the single Workflow pages layout
 */
export type SingleWorkflowLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

/**
 * Workflow layer metadata. Fetches the real workflow name so subpages
 * (documentation, schedule, policies, …) compose against it.
 */
export async function generateMetadata(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, workflow } = await props.params;
  const [ws, wf] = await Promise.all([
    fetchWorkspaceMeta(lang, workspace),
    fetchWorkflowMeta(lang, workspace, workflow),
  ]);
  // Match the workspace layout's ellipsis fallback so composed titles stay
  // visually consistent when either fetch fails.
  const wsName = ws?.name ?? `${workspace}…`;
  const wfName = wf?.name ?? `${workflow.slice(0, 8)}…`;
  return {
    title: {
      default: buildTitle([wfName, wsName]),
      template: buildTitleTemplate([wfName, wsName]),
    },
    description: clampDescription(wf?.description, `Workflow in ${wsName}`),
  };
}

/**
 * Layout for the single workflow pages in the Console
 */
export default async function WorkflowLayout(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<SingleWorkflowLayoutParams>;
  }>
) {
  const params = await props.params;
  const { children } = props;

  return (
    <WorkflowLayoutWrapper workflowID={params.workflow}>
      {children}
    </WorkflowLayoutWrapper>
  );
}
