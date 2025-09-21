'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import RepositoryLayoutSkeleton from '@/components/ui/loading/RepositoryLayoutSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { RepositoryProvider } from '@/context/RepositoryContext';

import { useRepository } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

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
  const { dict } = useLocale();
  const { repositoryQuery } = useRepository(repositorySlug);
  const { isResourceAllowed, loading: isResourceAllowedLoading } =
    useResourceAllowed();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Make sure the user is allowed to access the repository
  useEffect(() => {
    if (isResourceAllowedLoading) return;
    if (
      !isResourceAllowed('repository', 'read', repositoryQuery.data?.data?.id)
    ) {
      // Redirect to the workspace repositories page if the user is not allowed to access the repository
      router.push(`${workspaceUrl}/repositories`);
    }
  }, [
    isResourceAllowed,
    isResourceAllowedLoading,
    repositoryQuery.data?.data?.id,
    workspaceUrl,
    router,
  ]);

  if (repositoryQuery.isLoading || isResourceAllowedLoading) {
    return <RepositoryLayoutSkeleton />;
  }

  if (repositoryQuery.isError) {
    return (
      <CommonErrorDisplay
        error={repositoryQuery.error}
        variant='page'
        showReload={true}
        onRetry={() => repositoryQuery.refetch()}
        title={dict.common.error}
        description={dict.common.weEncounteredError}
      />
    );
  }

  if (!repositoryQuery.data?.data) {
    return (
      <CommonErrorDisplay
        variant='page'
        showHome={true}
        title={`${dict.repository.repository} ${dict.common.pageNotFound.toLowerCase()}`}
        description={dict.common.tryAgainOrContactSupport}
      />
    );
  }

  return (
    <RepositoryProvider repository={repositoryQuery.data?.data}>
      <RepositoryHeader />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
