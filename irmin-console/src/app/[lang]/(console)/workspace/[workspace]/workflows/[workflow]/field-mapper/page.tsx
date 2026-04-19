import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowFieldMapperSection from '@/components/workflow/WorkflowFieldMapperSection';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.fieldMapper };
}

/**
 * Page for the Workflow field mapper
 */
export default async function WorkflowFieldMapperPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowFieldMapperSection workflowID={params.workflow} />;
}
