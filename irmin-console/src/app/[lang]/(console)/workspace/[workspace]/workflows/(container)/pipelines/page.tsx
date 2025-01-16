import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getEditorItems } from '@/lib/actions/editor-items';
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
  const [editorItems, workflows, connections, repositories] = await Promise.all(
    [
      getEditorItems(token),
      getPipelineWorkflows(token),
      getConnections(token),
      getRepositories(token),
    ]
  );
  if (!workflows || !connections || !repositories || !editorItems)
    return notFound();
  return (
    <PipelineWorkflowsSection
      editorItems={editorItems}
      workflows={workflows}
      connections={connections}
      repositories={repositories}
      sideModalOpen={false}
    />
  );
}
