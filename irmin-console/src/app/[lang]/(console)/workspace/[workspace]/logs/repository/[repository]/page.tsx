'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useRepository } from '@/hooks/useRepository';

import type { RepositoryLogsLayoutParams } from './layout';

/**
 * Repository Audit Logs page
 */
export default function RepositoryLogsPage() {
  const { dict } = useLocale();
  const params = useParams<RepositoryLogsLayoutParams>();

  const { repositoryQuery } = useRepository(params.repository);

  if (repositoryQuery.isLoading) return <LoadingSpinner />;
  if (repositoryQuery.isError)
    return <div>{repositoryQuery.error.message}</div>;
  if (!repositoryQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      repository={repositoryQuery.data.data}
      logsForType='repository'
      logsFor={repositoryQuery.data.data.slug}
      title={dict.logs.repositoryLogs}
    />
  );
}
