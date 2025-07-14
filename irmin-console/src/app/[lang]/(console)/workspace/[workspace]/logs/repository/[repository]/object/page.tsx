'use client';

import { useParams, useSearchParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useRepository } from '@/hooks/useRepository';
import { useRepositoryObject } from '@/hooks/useRepositoryObject';

import type { RepositoryObjectLogsLayoutParams } from './layout';

/**
 * Repository Object Audit Logs page
 */
export default function RepositoryObjectLogsPage() {
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
    return <LoadingSpinner />;
  if (repositoryQuery.isError)
    return <div>{repositoryQuery.error.message}</div>;
  if (repositoryObjectQuery.isError)
    return <div>{repositoryObjectQuery.error.message}</div>;

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
