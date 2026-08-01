import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowDocumentationSection from '@/components/workflow/WorkflowDocumentationSection';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.documentation };
}

/**
 * Page for the Workflow documentation
 */
export default async function WorkflowDocumentationPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowDocumentationSection workflowID={params.workflow} />;
}
