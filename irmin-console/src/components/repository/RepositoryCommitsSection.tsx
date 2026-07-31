'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryCommits } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import CommitList from './commits/CommitList';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  return (
    <SafeComponent
      level='section'
      titleKey='commitsTitle'
      descriptionKey='commitsDescription'
    >
      <RepositoryCommitsSectionContent />
    </SafeComponent>
  );
}

function RepositoryCommitsSectionContent() {
  const { dict } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();
  const { commitsQuery, commits, hasMore, loadMoreCommits } =
    useRepositoryCommits(repository.slug, currentRef);

  const canViewCommits = useMemo(
    () => isResourceAllowed('repository_commit', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  if (!canViewCommits) {
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

  if (commitsQuery.error) {
    return (
      <div
        className={`
          relative container mx-auto max-w-7xl px-2
          md:px-4
        `}
      >
        <QueryError
          error={commitsQuery.error}
          onRetry={() => commitsQuery.refetch()}
          title={dict.common.errors.failedToLoadCommits}
          description={dict.common.errors.failedToLoadAgain}
        />
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
        <CommitList
          commits={commits}
          loading={
            commitsQuery.isLoading && (commits?.length === 0 || !commits)
          }
        />
        <Button
          className='w-full'
          variant='gray'
          size='default'
          disabled={!hasMore}
          onClick={loadMoreCommits}
          loading={commitsQuery.isLoading}
        >
          {dict.common.loadMore}
        </Button>
        {commitsQuery.data?.data &&
          commitsQuery.data?.data.length > 0 &&
          commitsQuery.isLoading && <LoadingSkeleton className='h-96' />}
      </div>
    </div>
  );
}
