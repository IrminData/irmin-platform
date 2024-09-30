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
export async function generateMetadata({
  params,
}: {
  params: SingleWorkflowLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workflow ${params.workflow} | ${formattedWorkspace} | IRMIN Console`,
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
  const workflowId = params.workflow;
  if (isInvalidRouteProp(workflowId)) notFound();

  return (
    <WorkflowLayoutWrapper
      workflowId={workflowId}
      workspaceSlug={params.workspace}
      locale={params.lang}
    >
      {children}
    </WorkflowLayoutWrapper>
  );
}
