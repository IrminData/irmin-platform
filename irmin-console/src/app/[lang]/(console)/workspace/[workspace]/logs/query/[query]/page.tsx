'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useStoredQueries } from '@/hooks/useStoredQueries';

import { QueryLogsLayoutParams } from './layout';

/**
 * Stored Query Audit Logs page
 */
export default function StoredQueryLogsPage() {
  const { dict } = useLocale();
  const params = useParams<QueryLogsLayoutParams>();

  const { storedQueriesQuery } = useStoredQueries();

  if (storedQueriesQuery.isLoading) return <LoadingSpinner />;
  if (storedQueriesQuery.isError)
    return <div>{storedQueriesQuery.error.message}</div>;
  if (!storedQueriesQuery.data?.data) return <div>{dict.common.error}</div>;

  const storedQuery = storedQueriesQuery.data?.data.find(
    (query) => query.id === params.query
  );

  if (!storedQuery) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      storedQuery={storedQuery}
      logsForType='stored_query'
      logsFor={storedQuery?.id}
      title={dict.logs.storedQueryLogs}
    />
  );
}
