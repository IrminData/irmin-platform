import { notFound } from 'next/navigation';

import { getUser } from '@/lib/actions/users';
import { getToken } from '@/lib/getToken';
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
  const currentWorkspace = params.workspace;
  const userID = params.user;

  const token = await getToken();
  const [user, { dict }] = await Promise.all([
    getUser({
      workspace: currentWorkspace,
      userID,
      token,
    }),
    initDict(),
  ]);

  if (!user.data) return notFound();
  return (
    <LogsSection
      user={user.data}
      logsForType='user'
      logsFor={userID}
      title={dict.logs.userAuditLogs}
    />
  );
}
