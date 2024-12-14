import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
import { getRepositories } from '@/lib/actions/repositories';
import { getImportWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

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
  const token = await getToken();
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems(token),
      getImportWorkflows(token),
      getConnections(token),
      getRepositories(token),
    ]
  );
  if (!workflows || !connections || !repositories || !editorItems)
    return notFound();
  return (
    <ImportWorkflowsSection
      editorItems={editorItems}
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={true}
    />
  );
}
