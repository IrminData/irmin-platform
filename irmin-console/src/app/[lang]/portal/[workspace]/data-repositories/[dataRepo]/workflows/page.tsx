'use client';

import PortalTitle from '@/components/portal/portalTitle';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page for the Data Repository workflows.
 *
 * @remarks
 *
 * Shows a list of workflows that are used to create this data repository (connections, actions).
 * Shows a list of workflows that depend on this data repository (export syncs, actions).
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function DataRepositoryWorkflowsPage({
  params,
}: {
  params: { dataRepo: string };
}) {
  const { dict } = useLocale();
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
        <PortalTitle title={dict.dataRepository.tabs.workflows} />
      </div>
    </>
  );
}
