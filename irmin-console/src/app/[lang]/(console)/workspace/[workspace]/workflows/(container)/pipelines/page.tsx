import PipelineWorkflowsSection from '@/components/workflow/PipelineWorkflowsSection';

import { WorkspaceLayoutParams } from '../../../layout';

/**
 * Pipeline Workflows page in the workspace
 *
 * Uses {@link PipelineWorkflowsSection} to provide UI to list Pipeline workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function PipelineWorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <PipelineWorkflowsSection sideModalOpen={openSideModal} />;
}
