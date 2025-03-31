import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflowsOfType } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import PipelineWorkflowsSection from '@/components/workflow/PipelineWorkflowsSection';

import { PipelineWorkflow } from '@/types/core/Workflow';

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
      sideModalOpen={false}
    />
  );
}
