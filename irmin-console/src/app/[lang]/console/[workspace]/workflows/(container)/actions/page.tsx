import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getActionWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

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
export default async function ActionWorkflowsPage() {
  const token = await getToken();
  const [workflows, connections, repositories] = await Promise.all([
    getActionWorkflows(token),
    getConnections(token),
    getRepositories(token),
  ]);
  return (
    <ActionWorkflowsSection
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={false}
    />
  );
}
