import { getLogs } from '@/lib/actions/logs';
import { getToken } from '@/lib/getToken';

import LogsSection from '@/components/logs/LogsSection';

/**
 * Logs page - showing all log events for the workspace.
 */
export default async function LogsPage() {
  const token = await getToken();
  const logs = await getLogs(token);
  return <LogsSection logEvents={logs} />;
}
