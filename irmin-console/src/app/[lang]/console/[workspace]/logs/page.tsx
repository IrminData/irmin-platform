import { getLogs } from '@/lib/actions/logs';

import LogsSection from '@/components/logs/LogsSection';

/**
 * Logs page - showing all log events for the workspace.
 */
export default async function LogsPage() {
  const logs = await getLogs();
  return <LogsSection logEvents={logs} />;
}
