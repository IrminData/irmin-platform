'use client';

import PortalTitle from '@/components/portal/portalTitle';
import DataRepoTable from '@/components/portal/tables/dataRepoTable';
import TableSkeleton from '@/components/portal/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal Data Repositories list page
 *
 * @remarks
 *
 * This page is used to manage Data Repositories in the portal.
 * It shows a list of Data Repositories that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage Data Repository data.
 *
 * @returns UI for managing Data Repositories
 */
export default function DataRepositoriesPage() {
  const { dict } = useLocale();
  const { dataRepositories } = useWorkspace();

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.dataRepositories} />
      {dataRepositories.isLoading ? (
        <TableSkeleton />
      ) : (
        <DataRepoTable dataRepositories={dataRepositories.dataRepositories} />
      )}
    </>
  );
}
