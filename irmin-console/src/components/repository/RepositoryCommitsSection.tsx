'use client';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';
import CommitList from './commits/CommitList';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { dict } = useLocale();
  const { commits, loadingCommits, hasMoreCommits, loadMoreCommits } =
    useRepository();

  return (
    <div className='relative container mx-auto max-w-7xl px-2 md:px-4'>
      <div className='flex w-full flex-col gap-4'>
        <CommitList
          commits={commits ?? []}
          loading={loadingCommits && (commits?.length === 0 || !commits)}
        />
        <Button
          className='w-full'
          variant='gray'
          size='default'
          disabled={!hasMoreCommits}
          onClick={loadMoreCommits}
          loading={loadingCommits}
        >
          {dict.common.loadMore}
        </Button>
        {commits && commits.length > 0 && loadingCommits && (
          <LoadingSkeleton className='h-96' />
        )}
      </div>
    </div>
  );
}
