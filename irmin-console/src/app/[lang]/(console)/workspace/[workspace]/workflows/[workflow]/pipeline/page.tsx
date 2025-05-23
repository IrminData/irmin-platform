import WorkflowPipelineSection from '@/components/workflow/WorkflowPipelineSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Single workflow pipeline page
 */
export default async function WorkflowPipelinePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowPipelineSection workflowID={params.workflow} />;
}
