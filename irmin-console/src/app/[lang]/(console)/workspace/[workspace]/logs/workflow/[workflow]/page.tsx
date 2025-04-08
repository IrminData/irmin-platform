import { notFound } from 'next/navigation';

import { getLogs } from '@/lib/actions/logs';
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

  const token = await getToken();
  const [logs, workflow, { dict }] = await Promise.all([
    getLogs({ workspace: currentWorkspace, token }), // TODO: Get logs specific to the workflow
    getWorkflow({
      workspace: currentWorkspace,
      workflowID: params.workflow,
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
