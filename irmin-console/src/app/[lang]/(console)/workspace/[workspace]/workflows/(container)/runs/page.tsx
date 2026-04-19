import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import AllWorkflowRunsSection from '@/components/workflow/AllWorkflowRunsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.workflowsRuns };
}

/**
 * All Workflow Runs page in the workspace
 */
export default async function AllWorkflowRunsPage() {
  return <AllWorkflowRunsSection />;
}
