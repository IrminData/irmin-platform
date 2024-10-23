import { getWorkflowLogs } from '@/lib/actions/logs';
import { getWorkflow } from '@/lib/actions/workflows';

import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Logs page - showing all log events for the workflow.
 */
export default async function WorkflowLogsPage(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}) {
  const params = await props.params;

  const [logs, workflow] = await Promise.all([
    getWorkflowLogs(params.workflow),
    getWorkflow(params.workflow),
  ]);

  return <LogsSection workflow={workflow} logEvents={logs} />;
}
