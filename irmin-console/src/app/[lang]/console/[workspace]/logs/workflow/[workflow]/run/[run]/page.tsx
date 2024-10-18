import WorkflowRunLogsSection from '@/components/logs/WorkflowRunLogsSection';

import { WorkflowRunLogsLayoutParams } from './layout';

/**
 * Workflow Run Logs page - showing logs for a specific workflow run.
 */
export default async function WorkflowRunLogsPage(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}) {
  const params = await props.params;
  return (
    <WorkflowRunLogsSection
      workflowId={params.workflow}
      workflowRunId={params.run}
    />
  );
}
