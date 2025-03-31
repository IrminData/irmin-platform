import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflowsOfType } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ImportWorkflowsSection from '@/components/workflow/ImportWorkflowsSection';

import { ImportWorkflow } from '@/types/core/Workflow';

import { WorkspaceLayoutParams } from '../../../../layout';

/**
 * Page to create a new Import Workflow in the workspace
 *
 * Uses {@link ImportWorkflowsSection} to provide UI for new Import Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the import workflows page.
 */
export default async function ImportWorkflowCreatePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems({ workspace: params.workspace, path: '', token }),
      getWorkflowsOfType({
        workspace: params.workspace,
        workflowType: 'import',
        token,
      }),
      getConnections({ workspace: params.workspace, token }),
      getRepositories({ workspace: params.workspace, token }),
    ]
  );
  return (
    <ImportWorkflowsSection
      editorItems={editorItems.data ?? []}
      workflows={(workflows.data as ImportWorkflow[]) ?? []}
      connections={connections.data ?? []}
      repositories={repositories.data ?? []}
      sideModalOpen={false}
    />
  );
}
