import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getWorkflow, getWorkflowRuns } from '@/lib/actions/workflows';
import { Locale } from '@/lib/dict';

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
    params: SingleWorkflowLayoutParams;
  }>
) {
  const params = await props.params;

  const { children } = props;

  const workflowId = params.workflow;
  if (isInvalidRouteProp(workflowId)) notFound();

  const runs = await getWorkflowRuns(workflowId);
  const workflow = await getWorkflow(workflowId);

  return (
    <WorkflowProvider runs={runs} initialWorkflow={workflow}>
      <WorkflowLayoutWrapper workflowID={workflowId}>
        {children}
      </WorkflowLayoutWrapper>
    </WorkflowProvider>
  );
}
