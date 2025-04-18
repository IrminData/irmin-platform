'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { RepositoryProvider } from '@/context/RepositoryContext';

import { Branch } from '@/types/core/Branch';
import { Commit } from '@/types/core/Commit';
import { Repository } from '@/types/core/Repository';
import { Tag } from '@/types/core/Tag';

import RepositoryHeader from './RepositoryHeader';

/**
 * Component to wrap the Repository pages in.
 *
 * Uses {@link RepositoryHeader} to display the header and tabs.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function RepositoryLayoutWrapper({
  children,
  repositorySlug,
  initialRepository,
  initialBranches,
  initialTags,
  initialCommits,
}: {
  children: React.ReactNode;
  repositorySlug: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
  initialCommits: Commit[];
}) {
  const searchParams = useSearchParams();
  const refSearchParam = searchParams.get('ref');

  const initialRef = useMemo(
    () => refSearchParam || initialRepository.default_branch,
    [refSearchParam, initialRepository]
  );

  return (
    <RepositoryProvider
      repositorySlug={repositorySlug}
      initialRef={initialRef}
      initialRepository={initialRepository}
      initialBranches={initialBranches}
      initialTags={initialTags}
      initialCommits={initialCommits}
    >
      <RepositoryHeader />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
