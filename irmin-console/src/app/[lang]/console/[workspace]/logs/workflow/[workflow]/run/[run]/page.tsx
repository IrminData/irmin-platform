import WorkflowRunLogsSection from '@/components/logs/WorkflowRunLogsSection';

import { WorkflowRunLogsLayoutParams } from './layout';

/**
 * Workflow Run Logs page - showing logs for a specific workflow run.
 */
export default function WorkflowRunLogsPage({
  params,
}: {
  params: WorkflowRunLogsLayoutParams;
}) {
  return (
    <WorkflowRunLogsSection
      workflow={params.workflow}
      workflowRunId={params.run}
    />
  );
}
