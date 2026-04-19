'use client';

import { Suspense } from 'react';

import { useParams, useSearchParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { QueryError } from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useRepository, useRepositoryObject } from '@/hooks/api';

import type { RepositoryObjectLogsLayoutParams } from './layout';

/**
 * Repository Object Audit Logs page
 */
export default function RepositoryObjectLogsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <RepositoryObjectLogsPageContent />
    </Suspense>
  );
}

function RepositoryObjectLogsPageContent() {
  const { dict } = useLocale();
  const params = useParams<RepositoryObjectLogsLayoutParams>();
  const searchParams = useSearchParams();

  const ref = searchParams.get('ref');
  const path = searchParams.get('path');

  const { repositoryQuery } = useRepository(params.repository);
  const { repositoryObjectQuery } = useRepositoryObject(
    params.repository,
    ref ?? undefined,
    path ?? undefined
  );

  if (repositoryQuery.isLoading || repositoryObjectQuery.isLoading)
    return <ListSkeleton />;
  if (repositoryQuery.isError) {
    return (
      <QueryError
        error={repositoryQuery.error}
        onRetry={() => repositoryQuery.refetch()}
        title={dict.common.errors.failedToLoadRepository}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }
  if (repositoryObjectQuery.isError) {
    return (
      <QueryError
        error={repositoryObjectQuery.error}
        onRetry={() => repositoryObjectQuery.refetch()}
        title={dict.common.errors.failedToLoadObjects}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }

  return (
    <LogsSection
      repository={repositoryQuery.data?.data ?? undefined}
      repositoryObject={repositoryObjectQuery.data?.data ?? undefined}
      logsForType='repository_object'
      logsFor={repositoryObjectQuery.data?.data?.id}
      title={dict.logs.repositoryObjectLogs}
    />
  );
}
