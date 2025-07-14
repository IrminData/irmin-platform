import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { WorkspaceLayoutParams } from '../../../layout';

/**
 * Export Workflows page in the workspace
 *
 * Uses {@link ExportWorkflowsSection} to provide UI to list export workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function ExportWorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <ExportWorkflowsSection sideModalOpen={openSideModal} />;
}
