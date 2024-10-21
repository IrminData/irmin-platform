import { getWorkflows } from '@/lib/actions/workflows';

import WorkflowsSection from '@/components/workflow/WorkflowsSection';

/**
 * Workflows page in the workspace
 *
 * Uses {@link WorkflowsSection} to provide UI to list workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function WorkflowsPage() {
  const workflows = await getWorkflows();
  return <WorkflowsSection workflows={workflows} sideModalOpen={false} />;
}
