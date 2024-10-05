'use client';

import { useRepository } from '@/context/RepositoryContext';

import CommitList from './commits/CommitList';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { commits, loadingCommits } = useRepository();

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <CommitList commits={commits ?? []} loading={loadingCommits} />
    </div>
  );
}
