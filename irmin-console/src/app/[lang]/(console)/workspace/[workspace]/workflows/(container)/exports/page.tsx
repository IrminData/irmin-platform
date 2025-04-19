import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

import { ExportWorkflow } from '@/types/core/Workflow';

import { WorkspaceLayoutParams } from '../../../layout';

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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems({ workspace: params.workspace, path: '', token }),
      getWorkflows({ workspace: params.workspace, token }),
      getConnections({ workspace: params.workspace, token }),
      getRepositories({ workspace: params.workspace, token }),
    ]
  );
  return (
    <ExportWorkflowsSection
      editorItems={editorItems.data ?? []}
      workflows={(workflows.data as ExportWorkflow[]) ?? []}
      connections={connections.data ?? []}
      repositories={repositories.data ?? []}
      sideModalOpen={openSideModal}
    />
  );
}
