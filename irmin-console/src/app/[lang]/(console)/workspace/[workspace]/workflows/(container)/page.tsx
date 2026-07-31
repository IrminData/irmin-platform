import WorkflowsSection from '@/components/workflow/WorkflowsSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { WorkspaceLayoutParams } from '../../layout';

/**
 * Workflows page in the workspace
 *
 * Uses {@link WorkflowsSection} to provide UI to list workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function WorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <WorkflowsSection sideModalOpen={openSideModal} />;
}
