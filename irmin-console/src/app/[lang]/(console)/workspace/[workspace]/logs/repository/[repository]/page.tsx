'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useRepository } from '@/hooks/api';

import type { RepositoryLogsLayoutParams } from './layout';

/**
 * Repository Audit Logs page
 */
export default function RepositoryLogsPage() {
  const { dict } = useLocale();
  const params = useParams<RepositoryLogsLayoutParams>();

  const { repositoryQuery } = useRepository(params.repository);

  if (repositoryQuery.isLoading) return <ListSkeleton />;
  if (repositoryQuery.isError) {
    return (
      <QueryError
        error={repositoryQuery.error}
        onRetry={() => repositoryQuery.refetch()}
        title={dict.common.error}
      />
    );
  }
  if (!repositoryQuery.data?.data) {
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
      repository={repositoryQuery.data.data}
      logsForType='repository'
      logsFor={repositoryQuery.data.data.slug}
      title={dict.logs.repositoryLogs}
    />
  );
}
