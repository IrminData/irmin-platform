'use client';

import { useEffect } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useData } from '@/context/DataContext';

import { Repository } from '@/types/api/Repository';

const DatatableSchemaChart = dynamic(() => import('./DatatableSchemaChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the structure of a selected repository, like the tables and their columns.
 */
export default function RepositoryStructureSection({
  repository,
}: {
  repository?: Repository;
}) {
  const { fetchSchemaForTables, schemaResults } = useData();

  // Fetch schema for tables in the repository
  useEffect(() => {
    if (!repository) return;
    fetchSchemaForTables(repository.tables);
  }, [repository, fetchSchemaForTables]);

  return (
    <>
      {!schemaResults && <LoadingSkeleton />}
      {schemaResults && (
        <DatatableSchemaChart schema={schemaResults?.data?.tables ?? []} />
      )}
    </>
  );
}
