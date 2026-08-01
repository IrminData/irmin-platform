'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useConnection } from '@/hooks/api';

import type { ConnectionLogsLayoutParams } from './layout';

/**
 * Connection Audit Logs page
 */
export default function ConnectionLogsPage() {
  const { dict } = useLocale();
  const params = useParams<ConnectionLogsLayoutParams>();

  const { connectionQuery } = useConnection(params.connection);

  if (connectionQuery.isLoading) return <LoadingSpinner />;
  if (connectionQuery.isError) {
    return (
      <QueryError
        error={connectionQuery.error}
        onRetry={() => connectionQuery.refetch()}
        title={dict.common.errors.failedToLoadConnection}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }
  if (!connectionQuery.data?.data) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        showHome={true}
        title={dict.common.errors.connectionNotFound}
        description={dict.common.errors.connectionNotFoundDescription}
      />
    );
  }

  return (
    <LogsSection
      connection={connectionQuery.data.data}
      logsForType='connection'
      logsFor={connectionQuery.data.data.id}
      title={dict.logs.connectionLogs}
    />
  );
}
