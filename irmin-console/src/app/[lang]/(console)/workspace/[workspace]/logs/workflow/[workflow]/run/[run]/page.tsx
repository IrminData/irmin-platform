import { notFound } from 'next/navigation';

import { getLogs } from '@/lib/actions/logs';
import { getWorkflowRun } from '@/lib/actions/workflow-runs';
import { getWorkflow } from '@/lib/actions/workflows';
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
    getLogs({
      workspace: params.workspace,
      token,
    }),
    getWorkflowRun({
      workspace: params.workspace,
      workflowID: params.workflow,
      runID: params.run,
      token,
    }),
    getWorkflow({
      workspace: params.workspace,
      workflowID: params.workflow,
      token,
    }),
  ]);
  if (!logs.data || !run.data || !workflow.data) return notFound();
  return (
    <WorkflowRunLogsSection
      workflowRun={run.data}
      workflowRunLogs={logs.data}
      workflow={workflow.data}
    />
  );
}
