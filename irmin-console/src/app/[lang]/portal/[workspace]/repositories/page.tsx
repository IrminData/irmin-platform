'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import RepositoryList from '@/components/repository/RepositoryList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal Repositories list page
 *
 * @remarks
 *
 * This page is used to manage Repositories in the portal.
 * It shows a list of Repositories that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage Repository data.
 */
export default function RepositoriesPage() {
  const { dict } = useLocale();
  const { workspaceLoading, repositories } = useWorkspace();

  const loading = workspaceLoading || repositories.isLoading;

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <PortalTitle title={dict.portalNavigation.links.repositories} />
      <RepositoryList
        loading={loading}
        repositories={repositories.repositories}
      />
    </div>
  );
}
