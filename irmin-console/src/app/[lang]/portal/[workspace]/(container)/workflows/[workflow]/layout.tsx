import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';

import WorkflowLayoutWrapper from '@/components/workflow/WorkflowLayoutWrapper';

/**
 * URL parameters for the single Workflow pages layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param workflow - The ID of the workflow to show logs for
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
    title: `Workflow ${params.workflow ?? ''} | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the single workflow pages in the Portal
 */
export default function WorkflowLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: SingleWorkflowLayoutParams;
}>) {
  const workflowId = parseInt(params.workflow, 10);
  if (Number.isNaN(workflowId)) {
    return notFound();
  }
  return (
    <WorkflowLayoutWrapper workflowId={workflowId}>
      {children}
    </WorkflowLayoutWrapper>
  );
}
