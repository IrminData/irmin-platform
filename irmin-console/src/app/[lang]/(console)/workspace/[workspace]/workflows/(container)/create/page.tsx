import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import WorkflowsSection from '@/components/workflow/WorkflowsSection';

import { WorkspaceLayoutParams } from '../../../layout';

/**
 * Page to create a new Workflow in the workspace
 *
 * Uses {@link WorkflowsSection} to provide UI for new Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the workflows page.
 */
export default async function WorkflowCreatePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const workflows = await getWorkflows({ workspace: params.workspace, token });
  return (
    <WorkflowsSection workflows={workflows.data ?? []} sideModalOpen={true} />
  );
}
