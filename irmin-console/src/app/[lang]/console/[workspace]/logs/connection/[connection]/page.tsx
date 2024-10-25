import { Metadata } from 'next';

import { getConnection } from '@/lib/actions/connections';
import { getConnectionLogs } from '@/lib/actions/logs';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

/**
 * URL parameters for the Connection Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param connection - The slug of the connection to show logs for
 */
export type ConnectionLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  connection: string;
};

/**
 * SEO metadata for the Connection Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<ConnectionLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedConnection = params.connection.replace(/-/g, ' ');
  return {
    title: `Connection ${formattedConnection} logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Connection Logs page - showing all log events for the connection.
 */
export default async function ConnectionLogsPage(props: {
  params: Promise<ConnectionLogsLayoutParams>;
}) {
  const params = await props.params;

  const token = await getToken();
  const [logs, connection, { dict }] = await Promise.all([
    getConnectionLogs(params.connection, token),
    getConnection(params.connection, token),
    initDict(),
  ]);

  return (
    <LogsSection
      connection={connection}
      logEvents={logs}
      title={dict.logs.connectionLogs}
    />
  );
}
