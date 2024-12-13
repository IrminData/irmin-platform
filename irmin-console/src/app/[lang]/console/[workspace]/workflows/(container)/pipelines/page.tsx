import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getPipelineWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import PipelineWorkflowsSection from '@/components/workflow/PipelineWorkflowsSection';

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
export default async function PipelineWorkflowsPage() {
  const token = await getToken();
  const [workflows, connections, repositories] = await Promise.all([
    getPipelineWorkflows(token),
    getConnections(token),
    getRepositories(token),
  ]);
  return (
    <PipelineWorkflowsSection
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={false}
    />
  );
}
