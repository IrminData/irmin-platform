import WorkflowFieldMapperSection from '@/components/workflow/WorkflowFieldMapperSection';

import type { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow field mapper
 */
export default async function WorkflowFieldMapperPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowFieldMapperSection workflowID={params.workflow} />;
}
