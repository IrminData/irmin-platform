import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { WorkspaceLayoutParams } from '../../../layout';

export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.workflowsExports };
}

/**
 * Export Workflows page in the workspace
 */
export default async function ExportWorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <ExportWorkflowsSection sideModalOpen={openSideModal} />;
}
