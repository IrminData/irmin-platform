'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useConnection } from '@/hooks/useConnection';

/**
 * Connection Audit Logs page
 */
export default function ConnectionLogsPage() {
  const { dict } = useLocale();
  const params = useParams();

  const { connectionQuery } = useConnection(params.connection as string);

  if (connectionQuery.isLoading) return <LoadingSpinner />;
  if (connectionQuery.isError)
    return <div>{connectionQuery.error.message}</div>;
  if (!connectionQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      connection={connectionQuery.data.data}
      logsForType='connection'
      logsFor={connectionQuery.data.data.id}
      title={dict.logs.connectionLogs}
    />
  );
}
