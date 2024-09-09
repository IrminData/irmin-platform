'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Page for the Repository workflows.
 *
 * @remarks
 *
 * @todo Show a list of workflows that are used to create this repository (connections, actions).
 * @todo Show a list of workflows that depend on this repository (export syncs, actions).
 */
export default function RepositoryWorkflowsPage() {
  const { dict } = useLocale();

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='px-2 md:px-4'>
        <PortalTitle title={dict.repository.tabs.workflows} />
      </div>
    </div>
  );
}
