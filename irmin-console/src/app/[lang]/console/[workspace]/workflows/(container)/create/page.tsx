import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import WorkflowsSection from '@/components/workflow/WorkflowsSection';

/**
 * Page to create a new Workflow in the workspace
 *
 * Uses {@link WorkflowsSection} to provide UI for new Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the workflows page.
 */
export default async function WorkflowCreatePage() {
  const token = await getToken();
  const workflows = await getWorkflows(token);
  return <WorkflowsSection workflows={workflows} sideModalOpen={true} />;
}
