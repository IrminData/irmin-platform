'use client';

import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import RepositorySection from '@/components/repository/RepositorySection';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useRepositoryObject } from '@/hooks/useRepositoryObject';

import { RepositoryRouteParams } from '../layout';

/**
 * Page to view a repository object from a specific path at a specific ref
 */
export default function RepositoryObjectPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const path = searchParams.get('path');

  const { repositoryObjectQuery } = useRepositoryObject(
    params.repository,
    ref ? ref : undefined,
    path ? path : undefined
  );

  if (repositoryObjectQuery.isError) {
    console.error(repositoryObjectQuery.error);
    return notFound();
  }

  if (repositoryObjectQuery.isLoading || !repositoryObjectQuery.data?.data) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <RepositorySection
      initialSelectedObject={repositoryObjectQuery.data.data}
      initialObjectContentViewerOpen={true}
    />
  );
}
