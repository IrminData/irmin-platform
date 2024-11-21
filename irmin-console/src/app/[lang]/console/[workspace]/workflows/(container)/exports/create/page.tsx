import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getExportWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

/**
 * Page to create a new Export Workflow in the workspace
 *
 * Uses {@link ExportWorkflowsSection} to provide UI for new Export Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the export workflows page.
 */
export default async function ExportWorkflowCreatePage() {
  const token = await getToken();
  const [workflows, connections, repositories] = await Promise.all([
    getExportWorkflows(token),
    getConnections(token),
    getRepositories(token),
  ]);
  return (
    <ExportWorkflowsSection
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={true}
    />
  );
}
