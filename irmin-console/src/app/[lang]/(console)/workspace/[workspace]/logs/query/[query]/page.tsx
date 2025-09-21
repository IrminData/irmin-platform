'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
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
        title={dict.common.error}
      />
    );
  }
  if (!storedQueriesQuery.data?.data) {
    return (
      <CommonErrorDisplay
        variant='page'
        title={dict.common.error}
        description={dict.common.weEncounteredError}
        showHome={true}
      />
    );
  }

  const storedQuery = storedQueriesQuery.data?.data.find(
    (query) => query.id === params.query
  );

  if (!storedQuery) {
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
      storedQuery={storedQuery}
      logsForType='stored_query'
      logsFor={storedQuery?.id}
      title={dict.logs.storedQueryLogs}
    />
  );
}
