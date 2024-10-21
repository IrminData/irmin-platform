import { getExportWorkflows } from '@/lib/actions/workflows';

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
  const workflows = await getExportWorkflows();
  return <ExportWorkflowsSection workflows={workflows} sideModalOpen={false} />;
}
