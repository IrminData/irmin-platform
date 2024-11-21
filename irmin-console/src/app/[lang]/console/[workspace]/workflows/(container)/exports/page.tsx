import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getExportWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

/**
 * Export Workflows page in the workspace
 *
 * Uses {@link ExportWorkflowsSection} to provide UI to list export workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function ExportWorkflowsPage() {
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
      sideModalOpen={false}
    />
  );
}
