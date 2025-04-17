'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import IrminCore from '@/lib/core';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
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
  workspaceSlug,
  initialRepository,
  initialBranches,
  initialTags,
}: {
  children: React.ReactNode;
  repositorySlug: string;
  workspaceSlug: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
}) {
  const { locale } = useLocale();
  const { getToken } = useIAM();
  const searchParams = useSearchParams();
  const refSearchParam = searchParams.get('ref');

  const [commits, setCommits] = useState<Commit[]>();

  const initialRef = useMemo(
    () => refSearchParam || initialRepository.default_branch,
    [refSearchParam, initialRepository]
  );

  const fetchingCommitsRef = useRef(false);
  useEffect(() => {
    const fetchInitialDataWithRef = async () => {
      try {
        if (fetchingCommitsRef.current) return;
        fetchingCommitsRef.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const newCommits = await irminCore.commitService.fetchCommits({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: initialRef,
        });
        setCommits(newCommits.data ?? []);
      } catch (error) {
        console.error('Error fetching commits:', error);
        setCommits([]);
      } finally {
        fetchingCommitsRef.current = false;
      }
    };
    fetchInitialDataWithRef();
  }, [initialRef, workspaceSlug, repositorySlug, locale, getToken]);

  if (!commits) {
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }
  return (
    <RepositoryProvider
      repositorySlug={repositorySlug}
      initialRef={initialRef}
      initialRepository={initialRepository}
      initialBranches={initialBranches}
      initialTags={initialTags}
      initialCommits={commits}
    >
      <RepositoryHeader />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
