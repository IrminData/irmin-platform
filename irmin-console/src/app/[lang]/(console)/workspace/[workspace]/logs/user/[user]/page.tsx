'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useUser } from '@/hooks/useUser';

/**
 * User Audit Logs page
 */
export default function UserLogsPage() {
  const { dict } = useLocale();
  const params = useParams();

  const { userQuery } = useUser(params.user as string);

  if (userQuery.isLoading) return <LoadingSpinner />;
  if (userQuery.isError) return <div>{userQuery.error.message}</div>;
  if (!userQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      user={userQuery.data.data}
      logsForType='user'
      logsFor={userQuery.data.data.id}
      title={dict.logs.userAuditLogs}
    />
  );
}
