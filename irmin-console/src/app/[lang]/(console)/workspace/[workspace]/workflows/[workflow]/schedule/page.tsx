import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow schedule settings
 */
export default async function WorkflowSchedulePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;

  return <WorkflowScheduleSection workflowID={params.workflow} />;
}
