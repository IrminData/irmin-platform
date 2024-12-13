import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getImportWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ImportWorkflowsSection from '@/components/workflow/ImportWorkflowsSection';

/**
 * Import Workflows page in the workspace
 *
 * Uses {@link ImportWorkflowsSection} to provide UI to list import workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function ImportWorkflowsPage() {
  const token = await getToken();
  const [workflows, connections, repositories] = await Promise.all([
    getImportWorkflows(token),
    getConnections(token),
    getRepositories(token),
  ]);
  if (!workflows || !connections || !repositories) return notFound();
  return (
    <ImportWorkflowsSection
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={false}
    />
  );
}
