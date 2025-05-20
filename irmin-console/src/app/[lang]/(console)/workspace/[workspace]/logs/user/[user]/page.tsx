import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { UserLogsLayoutParams } from './layout';

/**
 * User Audit Logs page
 */
export default async function UserLogsPage(props: {
  params: Promise<UserLogsLayoutParams>;
}) {
  const params = await props.params;
  const userID = params.user;
  const { dict } = await initDict();

  return (
    <LogsSection
      userID={userID}
      logsForType='user'
      logsFor={userID}
      title={dict.logs.userAuditLogs}
    />
  );
}
