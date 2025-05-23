'use client';

import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryCommits } from '@/hooks/useRepositoryCommits';

import CommitList from './commits/CommitList';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { dict } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { commitsQuery, commits, hasMore, loadMoreCommits } =
    useRepositoryCommits(repository.slug, currentRef);

  return (
    <div className='relative container mx-auto max-w-7xl px-2 md:px-4'>
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
