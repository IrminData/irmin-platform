'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { RepositoryProvider } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useRepository } from '@/hooks/useRepository';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

import RepositoryHeader from './RepositoryHeader';

/**
 * Component to wrap the Repository pages in.
 *
 * Uses {@link RepositoryHeader} to display the header and tabs.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 * @param props.repositorySlug - The slug of the repository to display
 */
export default function RepositoryLayoutWrapper({
  children,
  repositorySlug,
}: {
  children: React.ReactNode;
  repositorySlug: string;
}) {
  const router = useRouter();
  const { repositoryQuery } = useRepository(repositorySlug);
  const { isResourceAllowed } = useResourceAllowed();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Make sure the user is allowed to access the repository
  useEffect(() => {
    if (
      !isResourceAllowed(
        PolicyResource.Repository,
        PolicyAction.Read,
        repositoryQuery.data?.data?.id
      )
    ) {
      // Redirect to the workspace repositories page if the user is not allowed to access the repository
      router.push(`${workspaceUrl}/repositories`);
    }
  }, [isResourceAllowed, repositoryQuery.data?.data?.id, workspaceUrl, router]);

  if (repositoryQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (!repositoryQuery.data?.data) {
    return <div>Repository not found</div>;
  }

  return (
    <RepositoryProvider repository={repositoryQuery.data?.data}>
      <RepositoryHeader />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
