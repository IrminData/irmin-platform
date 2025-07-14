import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow schedule settings
 */
export default async function WorkflowSchedulePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await props.params;

  return <WorkflowScheduleSection workflowID={params.workflow} />;
}
