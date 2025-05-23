import WorkflowSettingsSection from '@/components/workflow/WorkflowSettingsSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow settings
 */
export default async function WorkflowSettingsPage(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<SingleWorkflowLayoutParams>;
  }>
) {
  const params = await props.params;
  const { workflow } = params;

  return <WorkflowSettingsSection workflowID={workflow} />;
}
