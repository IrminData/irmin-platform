import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

import WorkflowLayoutWrapper from '@/components/workflow/WorkflowLayoutWrapper';

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
    title: `Workflow | ${formattedWorkspace} | IRMIN Console`,
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
