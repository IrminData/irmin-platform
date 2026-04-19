import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkflowSettingsSection from '@/components/workflow/WorkflowSettingsSection';

import type { SingleWorkflowLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.settings };
}

/**
 * Page for the Workflow settings
 */
export default async function WorkflowSettingsPage(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<SingleWorkflowLayoutParams>;
  }>
) {
  const params = await props.params;
  const { workflow } = params;

  return <WorkflowSettingsSection workflowID={workflow} />;
}
