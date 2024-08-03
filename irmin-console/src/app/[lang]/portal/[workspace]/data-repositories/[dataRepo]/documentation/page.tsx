'use client';

import DataRepoDocumentation from '@/components/data-repository/DataRepoDocumentation';

import { useWorkspace } from '@/context/workspace';

/**
 * Page for the Data Repository documentation
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function DataRepositorDocumentationsPage({
  params,
}: {
  params: { dataRepo: string };
}) {
  const {
    dataRepositories: { dataRepositories },
  } = useWorkspace();

  const dataRepo = dataRepositories.find(
    (repo) => repo.slug === params.dataRepo
  );

  if (!dataRepo) return <></>;

  return (
    <>
      <div className='px-2 md:px-4'>
        <DataRepoDocumentation dataRepo={dataRepo} />
      </div>
    </>
  );
}
