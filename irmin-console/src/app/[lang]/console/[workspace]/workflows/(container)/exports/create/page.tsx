import { getExportWorkflows } from '@/lib/actions/workflows';

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
  const workflows = await getExportWorkflows();
  return <ExportWorkflowsSection workflows={workflows} sideModalOpen={true} />;
}
