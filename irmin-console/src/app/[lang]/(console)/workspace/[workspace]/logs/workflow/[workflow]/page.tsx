import { notFound } from 'next/navigation';

import { getWorkflowLogs } from '@/lib/actions/logs';
import { getWorkflow } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Logs page - showing all log events for the workflow.
 */
export default async function WorkflowLogsPage(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const workflowID = params.workflow;

  const token = await getToken();
  const [logs, workflow, { dict }] = await Promise.all([
    getWorkflowLogs({
      workspace: currentWorkspace,
      workflow_id: workflowID,
      token,
    }),
    getWorkflow({
      workspace: currentWorkspace,
      workflowID,
      token,
    }),
    initDict(),
  ]);

  if (!workflow.data) return notFound();
  return (
    <LogsSection
      workflow={workflow.data}
      logEvents={logs.data ?? []}
      title={dict.logs.workflowLogs}
    />
  );
}
