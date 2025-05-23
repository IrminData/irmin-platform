import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

import { WorkspaceLayoutParams } from '../../../layout';

/**
 * Action Workflows page in the workspace
 *
 * Uses {@link ActionWorkflowsSection} to provide UI to list action workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function ActionWorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  const token = await getToken();
  const [editorItems, repositories] = await Promise.all([
    getEditorItems({ workspace: params.workspace, path: '', token }),
    getRepositories({ workspace: params.workspace, token }),
  ]);
  return (
    <ActionWorkflowsSection
      editorItems={editorItems.data ?? []}
      repositories={repositories.data ?? []}
      sideModalOpen={openSideModal}
    />
  );
}
