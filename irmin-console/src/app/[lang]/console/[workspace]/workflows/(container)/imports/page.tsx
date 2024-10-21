import { getImportWorkflows } from '@/lib/actions/workflows';

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
  const workflows = await getImportWorkflows();
  return <ImportWorkflowsSection workflows={workflows} sideModalOpen={false} />;
}
