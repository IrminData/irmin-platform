import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { ConnectionLogsLayoutParams } from './layout';

/**
 * Connection Audit Logs page
 */
export default async function ConnectionLogsPage(props: {
  params: Promise<ConnectionLogsLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const connectionID = params.connection;

  const token = await getToken();
  const [connection, { dict }] = await Promise.all([
    getConnection({
      workspace: currentWorkspace,
      connectionID,
      token,
    }),
    initDict(),
  ]);

  if (!connection.data) return notFound();
  return (
    <LogsSection
      connection={connection.data}
      logsForType='connection'
      logsFor={connectionID}
      title={dict.logs.connectionLogs}
    />
  );
}
