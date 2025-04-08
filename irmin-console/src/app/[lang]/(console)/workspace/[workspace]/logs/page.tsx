import { notFound } from 'next/navigation';

import { getLogs } from '@/lib/actions/logs';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Logs page - showing all log events for the workspace.
 */
export default async function LogsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const [logs, { dict }] = await Promise.all([
    getLogs({ workspace: currentWorkspace, token }),
    initDict(),
  ]);
  return (
    <LogsSection logEvents={logs.data ?? []} title={dict.logs.workspaceLogs} />
  );
}
