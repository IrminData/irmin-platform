'use client';

import { useData } from '@/context/DataContext';

import CommitList from './CommitList';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { commits, loadingCommits } = useData();

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <CommitList commits={commits ?? undefined} loading={loadingCommits} />
    </div>
  );
}
