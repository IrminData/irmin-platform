'use client';

import { useMemo } from 'react';

import CommitList from '@/components/repository/commits/CommitList';
import SafeComponent from '@/components/ui/error/SafeComponent';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryObjectHistory } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

export default function RepositoryObjectHistorySection({
  path,
}: {
  path: string;
}) {
  return (
    <SafeComponent
      level='section'
      titleKey='objectHistoryTitle'
      descriptionKey='objectHistoryDescription'
    >
      <RepositoryObjectHistorySectionContent path={path} />
    </SafeComponent>
  );
}

function RepositoryObjectHistorySectionContent({ path }: { path: string }) {
  const { dict } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();
  const { objectHistoryQuery } = useRepositoryObjectHistory(
    repository.slug,
    currentRef ?? repository.default_branch,
    path
  );

  const canViewHistory = useMemo(
    () => isResourceAllowed('repository_commit', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  if (!canViewHistory) {
    return (
      <div
        className={`
          w-full rounded-lg border border-gray-200 bg-card px-2 py-8
          dark:border-gray-800
        `}
      >
        <p
          className={`
            mx-auto mb-2 max-w-lg text-center text-lg text-card-foreground
            lg:text-2xl
          `}
        >
          {dict.common.insufficientPermissions}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        relative container mx-auto max-w-7xl px-2
        md:px-4
      `}
    >
      <div className='flex w-full flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-lg font-bold'>
            {dict.repository.objects.changeHistory}
          </h2>
          <p className='text-sm text-gray-500'>
            {path} @ {currentRef ?? repository.default_branch}
          </p>
        </div>
        <CommitList
          commits={objectHistoryQuery.data?.data ?? []}
          loading={objectHistoryQuery.isLoading}
        />
      </div>
    </div>
  );
}
