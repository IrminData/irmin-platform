import { notFound } from 'next/navigation';

import { getWorkflowRun } from '@/lib/actions/workflow-runs';
import { getWorkflow } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import WorkflowRunLogsSection from '@/components/logs/WorkflowRunLogsSection';

import { WorkflowRunLogsLayoutParams } from './layout';

/**
 * Workflow Run page - showing logs for a specific workflow run.
 */
export default async function WorkflowRunPage(props: {
  params: Promise<WorkflowRunLogsLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [run, workflow] = await Promise.all([
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
  if (!run.data || !workflow.data) return notFound();
  return (
    <WorkflowRunLogsSection workflowRun={run.data} workflow={workflow.data} />
  );
}
