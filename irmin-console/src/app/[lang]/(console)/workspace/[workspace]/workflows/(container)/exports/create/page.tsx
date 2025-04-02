import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflowsOfType } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

import { ExportWorkflow } from '@/types/core/Workflow';

import { WorkspaceLayoutParams } from '../../../../layout';

/**
 * Page to create a new Export Workflow in the workspace
 *
 * Uses {@link ExportWorkflowsSection} to provide UI for new Export Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the export workflows page.
 */
export default async function ExportWorkflowCreatePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems({ workspace: params.workspace, path: '', token }),
      getWorkflowsOfType({
        workspace: params.workspace,
        workflowType: 'export',
        token,
      }),
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
      sideModalOpen={true}
    />
  );
}
