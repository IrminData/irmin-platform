import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getActionWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

/**
 * Page to create a new Action Workflow in the workspace
 *
 * Uses {@link ActionWorkflowsSection} to provide UI for new Action Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the action workflows page.
 */
export default async function ActionWorkflowCreatePage() {
  const token = await getToken();
  const [workflows, connections, repositories] = await Promise.all([
    getActionWorkflows(token),
    getConnections(token),
    getRepositories(token),
  ]);
  if (!workflows || !connections || !repositories) return notFound();
  return (
    <ActionWorkflowsSection
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={true}
    />
  );
}
