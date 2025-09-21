'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useUser } from '@/hooks/api';

import type { UserLogsLayoutParams } from './layout';

/**
 * User Audit Logs page
 */
export default function UserLogsPage() {
  const { dict } = useLocale();
  const params = useParams<UserLogsLayoutParams>();

  const { userQuery } = useUser(params.user);

  if (userQuery.isLoading) return <ListSkeleton />;
  if (userQuery.isError) {
    return (
      <QueryError
        error={userQuery.error}
        onRetry={() => userQuery.refetch()}
        title={dict.common.error}
      />
    );
  }
  if (!userQuery.data?.data) {
    return (
      <CommonErrorDisplay
        variant='page'
        title={dict.common.error}
        description={dict.common.weEncounteredError}
        showHome={true}
      />
    );
  }

  return (
    <LogsSection
      user={userQuery.data.data}
      logsForType='user'
      logsFor={userQuery.data.data.id}
      title={dict.logs.userAuditLogs}
    />
  );
}
