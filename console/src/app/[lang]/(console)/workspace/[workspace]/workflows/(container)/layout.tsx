import type { Metadata } from 'next';

import type { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import { getServerDict } from '@/lib/dict/server';

import WorkflowsLayoutWrapper from '@/components/workflow/WorkflowsLayoutWrapper';

export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.workflows };
}

/**
 * Layout for the Workflows pages in the Console
 */
export default function ConsoleWorkflowsLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return <WorkflowsLayoutWrapper>{children}</WorkflowsLayoutWrapper>;
}
