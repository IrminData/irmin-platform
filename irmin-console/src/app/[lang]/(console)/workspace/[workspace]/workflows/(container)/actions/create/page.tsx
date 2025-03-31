import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflowsOfType } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

import { ActionWorkflow } from '@/types/core/Workflow';

import { WorkspaceLayoutParams } from '../../../../layout';

/**
 * Page to create a new Action Workflow in the workspace
 *
 * Uses {@link ActionWorkflowsSection} to provide UI for new Action Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the action workflows page.
 */
export default async function ActionWorkflowsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems({ workspace: params.workspace, path: '', token }),
      getWorkflowsOfType({
        workspace: params.workspace,
        workflowType: 'action',
        token,
      }),
      getConnections({ workspace: params.workspace, token }),
      getRepositories({ workspace: params.workspace, token }),
    ]
  );
  if (!workflows || !connections || !repositories || !editorItems)
    return notFound();
  return (
    <ActionWorkflowsSection
      editorItems={editorItems.data ?? []}
      workflows={(workflows.data as ActionWorkflow[]) ?? []}
      connections={connections.data ?? []}
      repositories={repositories.data ?? []}
      sideModalOpen={true}
    />
  );
}
