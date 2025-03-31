'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { getCommits } from '@/lib/actions/commits';
import { Dictionary } from '@/lib/dict';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

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
  dict,
  repositorySlug,
  workspaceSlug,
  initialRepository,
  initialBranches,
  initialTags,
}: {
  children: React.ReactNode;
  dict: Dictionary;
  repositorySlug: string;
  workspaceSlug: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
}) {
  const searchParams = useSearchParams();
  const refSearchParam = searchParams.get('ref');

  const [commits, setCommits] = useState<Commit[]>();

  const initialRef = useMemo(
    () => refSearchParam || initialRepository.default_branch,
    [refSearchParam, initialRepository]
  );

  useEffect(() => {
    const fetchInitialDataWithRef = async () => {
      const newCommits = await getCommits({
        workspace: workspaceSlug,
        repository: repositorySlug,
        ref: initialRef,
      });
      setCommits(newCommits);
    };
    fetchInitialDataWithRef();
  }, [initialRef, workspaceSlug, repositorySlug]);

  if (!commits) {
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }
  return (
    <RepositoryProvider
      dict={dict}
      repositorySlug={repositorySlug}
      initialRef={initialRef}
      initialRepository={initialRepository}
      initialBranches={initialBranches}
      initialTags={initialTags}
      initialCommits={commits}
    >
      <RepositoryHeader repositorySlug={repositorySlug} dict={dict} />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
