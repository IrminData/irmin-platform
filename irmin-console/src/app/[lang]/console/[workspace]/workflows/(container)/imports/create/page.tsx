import { getImportWorkflows } from '@/lib/actions/workflows';

import ImportWorkflowsSection from '@/components/workflow/ImportWorkflowsSection';

/**
 * Page to create a new Import Workflow in the workspace
 *
 * Uses {@link ImportWorkflowsSection} to provide UI for new Import Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the import workflows page.
 */
export default async function ImportWorkflowCreatePage() {
  const workflows = await getImportWorkflows();
  return <ImportWorkflowsSection workflows={workflows} sideModalOpen={true} />;
}
