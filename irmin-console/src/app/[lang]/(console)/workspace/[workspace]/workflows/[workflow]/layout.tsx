import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getWorkflowRuns } from '@/lib/actions/workflow-runs';
import { getWorkflow } from '@/lib/actions/workflows';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

import WorkflowLayoutWrapper from '@/components/workflow/WorkflowLayoutWrapper';

import { WorkflowProvider } from '@/context/WorkflowContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * URL parameters for the single Workflow pages layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The ID of the workflow to show
 */
export type SingleWorkflowLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

/**
 * SEO metadata for the single Worflow pages layout
 */
export async function generateMetadata(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workflow ${params.workflow} | ${formattedWorkspace} | IRMIN Console`,
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

  const workflowID = params.workflow;
  const workspace = params.workspace;
  if (isInvalidRouteProp(workflowID) || isInvalidRouteProp(workspace))
    return notFound();

  const token = await getToken();
  const [runs, workflow] = await Promise.all([
    getWorkflowRuns({
      workspace,
      workflowID,
      token,
    }),
    getWorkflow({
      workspace,
      workflowID,
      token,
    }),
  ]);

  if (!workflow.data) return notFound();

  return (
    <WorkflowProvider runs={runs.data ?? []} initialWorkflow={workflow.data}>
      <WorkflowLayoutWrapper workflowID={workflowID}>
        {children}
      </WorkflowLayoutWrapper>
    </WorkflowProvider>
  );
}
