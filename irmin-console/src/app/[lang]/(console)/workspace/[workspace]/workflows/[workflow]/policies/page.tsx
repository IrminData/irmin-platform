import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowPoliciesSection from '@/components/workflow/WorkflowPoliciesSection';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policies };
}

/**
 * Page for the Workflow policies
 */
export default async function WorkflowPoliciesPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return (
    <WorkflowPoliciesSection workflowID={params.workflow} type={'workflow'} />
  );
}
