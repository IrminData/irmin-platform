import { getWorkflowRunLogs } from '@/lib/actions/logs';
import { getWorkflow, getWorkflowRun } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import WorkflowRunLogsSection from '@/components/logs/WorkflowRunLogsSection';

import { WorkflowRunLogsLayoutParams } from './layout';

/**
 * Workflow Run Logs page - showing logs for a specific workflow run.
 */
export default async function WorkflowRunLogsPage(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [logs, run, workflow] = await Promise.all([
    getWorkflowRunLogs(params.workflow, params.run, token),
    getWorkflowRun(params.workflow, params.run, token),
    getWorkflow(params.workflow, token),
  ]);
  return (
    <WorkflowRunLogsSection
      workflowRun={run}
      workflowRunLogs={logs}
      workflow={workflow}
    />
  );
}
