import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowWorkflowableSection from '@/components/workflow/WorkflowWorkflowableSection';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.workflowable };
}

/**
 * Page to view and update workflow's workflowable
 */
export default async function WorkflowWorkflowablePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowWorkflowableSection workflowID={params.workflow} />;
}
