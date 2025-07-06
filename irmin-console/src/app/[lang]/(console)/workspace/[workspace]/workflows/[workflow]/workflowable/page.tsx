import WorkflowWorkflowableSection from '@/components/workflow/WorkflowWorkflowableSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page to view and update workflow's workflowable
 */
export default async function WorkflowWorkflowablePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowWorkflowableSection workflowID={params.workflow} />;
}
