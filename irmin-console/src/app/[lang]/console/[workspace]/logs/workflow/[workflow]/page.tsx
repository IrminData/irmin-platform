import { getWorkflowLogs } from '@/lib/actions/logs';
import { getWorkflow } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Logs page - showing all log events for the workflow.
 */
export default async function WorkflowLogsPage(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}) {
  const params = await props.params;

  const token = await getToken();
  const [logs, workflow] = await Promise.all([
    getWorkflowLogs(params.workflow, token),
    getWorkflow(params.workflow, token),
  ]);

  return <LogsSection workflow={workflow} logEvents={logs} />;
}
