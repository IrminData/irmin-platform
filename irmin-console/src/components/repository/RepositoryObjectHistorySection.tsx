'use client';

import CommitList from '@/components/repository/commits/CommitList';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryObjectHistory } from '@/hooks/useRepositoryObjectHistory';

export default function RepositoryObjectHistorySection({
  path,
}: {
  path: string;
}) {
  const { dict } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { objectHistoryQuery } = useRepositoryObjectHistory(
    repository.slug,
    currentRef ?? repository.default_branch,
    path
  );

  return (
    <div className='relative container mx-auto max-w-7xl px-2 md:px-4'>
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
