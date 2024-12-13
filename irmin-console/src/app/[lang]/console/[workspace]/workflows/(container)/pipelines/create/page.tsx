import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getPipelineWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import PipelineWorkflowsSection from '@/components/workflow/PipelineWorkflowsSection';

/**
 * Page to create a new Pipeline Workflow in the workspace
 *
 * Uses {@link PipelineWorkflowsSection} to provide UI for new Pipeline Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the Pipeline workflows page.
 */
export default async function PipelineWorkflowCreatePage() {
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
      sideModalOpen={true}
    />
  );
}
