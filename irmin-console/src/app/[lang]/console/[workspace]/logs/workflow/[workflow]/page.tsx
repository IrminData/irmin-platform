import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Logs page - showing all log events for the workflow.
 */
export default async function WorkflowLogsPage(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}) {
  const params = await props.params;
  return <LogsSection workflow={params.workflow} />;
}
