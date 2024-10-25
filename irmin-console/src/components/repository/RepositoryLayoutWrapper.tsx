'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { getCollections } from '@/lib/actions/collections';
import { getCommits } from '@/lib/actions/commits';
import { fetchSchemas } from '@/lib/actions/schema';
import { Dictionary } from '@/lib/dict';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { RepositoryProvider } from '@/context/RepositoryContext';

import { Branch } from '@/types/core/Branch';
import { Collection, RepositorySchema } from '@/types/core/Collection';
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
  initialRepository,
  initialBranches,
  initialTags,
}: {
  children: React.ReactNode;
  dict: Dictionary;
  repositorySlug: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
}) {
  const searchParams = useSearchParams();
  const refSearchParam = searchParams.get('ref');

  const [collections, setCollections] = useState<Collection[]>();
  const [schema, setSchema] = useState<RepositorySchema>();
  const [commits, setCommits] = useState<Commit[]>();

  const initialRef = useMemo(
    () => refSearchParam || initialRepository.default_branch,
    [refSearchParam, initialRepository]
  );

  useEffect(() => {
    const fetchInitialDataWithRef = async () => {
      const [newCollections, newCommits] = await Promise.all([
        getCollections(repositorySlug, initialRef),
        getCommits(repositorySlug, initialRef),
      ]);
      const newSchema = await fetchSchemas(
        newCollections.map((collection) => collection.name),
        repositorySlug,
        initialRef
      );
      setCommits(newCommits);
      setSchema(newSchema);
      setCollections(newCollections);
    };
    fetchInitialDataWithRef();
  }, [initialRef, repositorySlug]);

  if (!collections || !schema || !commits) {
    return (
      <div className='container relative mx-auto max-w-6xl py-12'>
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
      initialCollections={collections}
      initialSchema={schema}
      initialCommits={commits}
    >
      <RepositoryHeader repositorySlug={repositorySlug} dict={dict} />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
