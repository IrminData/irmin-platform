'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';

import { useLocale } from '@/context/LocaleContext';

import { useUser } from '@/hooks/useUser';

/**
 * User Audit Logs page
 */
export default function UserLogsPage() {
  const { dict } = useLocale();
  const params = useParams();

  const { userQuery } = useUser(params.user as string);

  if (!userQuery.data?.data) return <></>;
  return (
    <LogsSection
      user={userQuery.data.data}
      logsForType='user'
      logsFor={userQuery.data.data.id}
      title={dict.logs.userAuditLogs}
    />
  );
}
