'use client';

import PortalTitle from '@/components/portalTitle';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
