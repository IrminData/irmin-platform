import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Logs page - showing all log events for the workflow.
 */
export default function WorkflowLogsPage({
  params,
}: {
  params: WorkflowLogsLayoutParams;
}) {
  return <LogsSection workflow={params.workflow} />;
}
