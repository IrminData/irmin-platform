import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflowsOfType } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import PipelineWorkflowsSection from '@/components/workflow/PipelineWorkflowsSection';

import { PipelineWorkflow } from '@/types/core/Workflow';

import { WorkspaceLayoutParams } from '../../../../layout';

/**
 * Page to create a new Pipeline Workflow in the workspace
 *
 * Uses {@link PipelineWorkflowsSection} to provide UI for new Pipeline Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the Pipeline workflows page.
 */
export default async function PipelineWorkflowCreatePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems({ workspace: params.workspace, path: '', token }),
      getWorkflowsOfType({
        workspace: params.workspace,
        workflowType: 'pipeline',
        token,
      }),
      getConnections({ workspace: params.workspace, token }),
      getRepositories({ workspace: params.workspace, token }),
    ]
  );
  return (
    <PipelineWorkflowsSection
      editorItems={editorItems.data ?? []}
      workflows={(workflows.data as PipelineWorkflow[]) ?? []}
      connections={connections.data ?? []}
      repositories={repositories.data ?? []}
      sideModalOpen={true}
    />
  );
}
