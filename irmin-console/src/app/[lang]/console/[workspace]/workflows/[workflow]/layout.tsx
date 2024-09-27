import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';

import WorkflowLayoutWrapper from '@/components/workflow/WorkflowLayoutWrapper';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * URL parameters for the single Workflow pages layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The slug of the workflow to show
 */
export type SingleWorkflowLayoutParams = {
  lang: Locale;
  workspace: string;
  workflow: string;
};

/**
 * SEO metadata for the single Worflow pages layout
 */
export async function generateMetadata({
  params,
}: {
  params: SingleWorkflowLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedWorkflow = params.workflow.replace(/-/g, ' ');
  return {
    title: `Workflow ${formattedWorkflow} | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the single workflow pages in the Console
 */
export default function WorkflowLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: SingleWorkflowLayoutParams;
}>) {
  const workflow = params.workflow;
  if (isInvalidRouteProp(workflow)) {
    notFound();
  }
  return (
    <WorkflowLayoutWrapper workflowSlug={workflow}>
      {children}
    </WorkflowLayoutWrapper>
  );
}
