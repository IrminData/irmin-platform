'use client';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useData } from '@/context/DataContext';

const DatatableSchemaChart = dynamic(() => import('./DatatableSchemaChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the structure of a selected repository, like the tables and their columns.
 */
export default function RepositoryStructureSection() {
  const { schemaResults, loadingSchema } = useData();

  return (
    <>
      {!schemaResults || (loadingSchema && <LoadingSkeleton />)}
      {schemaResults && !loadingSchema && (
        <DatatableSchemaChart schema={schemaResults?.data?.tables ?? []} />
      )}
    </>
  );
}
