'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useStoredQueries } from '@/hooks/api';

import type { QueryLogsLayoutParams } from './layout';

/**
 * Stored Query Audit Logs page
 */
export default function StoredQueryLogsPage() {
  const { dict } = useLocale();
  const params = useParams<QueryLogsLayoutParams>();

  const { storedQueriesQuery } = useStoredQueries();

  if (storedQueriesQuery.isLoading) return <ListSkeleton />;
  if (storedQueriesQuery.isError) {
    return (
      <QueryError
        error={storedQueriesQuery.error}
        onRetry={() => storedQueriesQuery.refetch()}
        title={dict.common.errors.failedToLoadStoredQueries}
      />
    );
  }
  if (!storedQueriesQuery.data?.data) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        title={dict.common.errors.storedQueryNotFound}
        description={dict.common.errors.storedQueryNotFoundDescription}
        showHome={true}
      />
    );
  }

  const storedQuery = storedQueriesQuery.data?.data.find(
    (query) => query.id === params.query
  );

  if (!storedQuery) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        title={dict.common.errors.storedQueryNotFound}
        description={dict.common.errors.storedQueryNotFoundDescription}
        showHome={true}
      />
    );
  }

  return (
    <LogsSection
      storedQuery={storedQuery}
      logsForType='stored_query'
      logsFor={storedQuery?.id}
      title={dict.logs.storedQueryLogs}
    />
  );
}
