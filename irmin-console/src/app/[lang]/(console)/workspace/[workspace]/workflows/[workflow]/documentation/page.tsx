import WorkflowDocumentationSection from '@/components/workflow/WorkflowDocumentationSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow documentation
 */
export default async function WorkflowDocumentationPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return <WorkflowDocumentationSection workflowID={params.workflow} />;
}
