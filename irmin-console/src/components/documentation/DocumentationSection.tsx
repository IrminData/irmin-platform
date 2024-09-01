'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page UI to show the full documentation for the workspace
 */
export default function DocumentationSection() {
  const { dict } = useLocale();
  const {
    connections: { connections },
    exports: { exports },
    actions: { actions },
    repositories: { repositories },
  } = useWorkspace();

  return (
    <div className='px-2 md:px-4'>
      <PortalTitle title={dict.documentation.documentation} />
    </div>
  );
}
