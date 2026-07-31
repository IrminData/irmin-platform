import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.schedule };
}

/**
 * Page for the Workflow schedule settings
 */
export default async function WorkflowSchedulePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await props.params;

  return <WorkflowScheduleSection workflowID={params.workflow} />;
}
