'use client';

import PortalTitle from '@/components/portalTitle';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal datasets page
 *
 * @remarks
 *
 * This page is used to manage datasets in the portal.
 * It shows a list of datasets that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage dataset data.
 *
 * @returns UI for managing datasets
 */
export default function DatasetsPage() {
  const { dict } = useLocale();
  const { datasets } = useWorkspace();

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.datasets} />
      {datasets.isLoading ? (
        <TableSkeleton />
      ) : (
        <DatasetTable datasets={datasets.datasets} />
      )}
    </>
  );
}
