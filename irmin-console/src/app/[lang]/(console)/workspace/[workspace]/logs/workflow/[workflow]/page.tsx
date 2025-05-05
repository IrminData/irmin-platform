import { notFound } from 'next/navigation';

import { getWorkflow } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Audit Logs page
 */
export default async function WorkflowLogsPage(props: {
  params: Promise<WorkflowLogsLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const workflowID = params.workflow;

  const token = await getToken();
  const [workflow, { dict }] = await Promise.all([
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
      logsForType='workflow'
      logsFor={workflowID}
      title={dict.logs.workflowLogs}
    />
  );
}
