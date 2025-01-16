import { notFound } from 'next/navigation';

import { getLogs } from '@/lib/actions/logs';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

/**
 * Logs page - showing all log events for the workspace.
 */
export default async function LogsPage() {
  const token = await getToken();
  const [logs, { dict }] = await Promise.all([getLogs(token), initDict()]);
  if (!logs) return notFound();
  return <LogsSection logEvents={logs} title={dict.logs.workspaceLogs} />;
}
