'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Workspace home page
 */
export default function WorkspaceHomePage() {
  const { dict } = useLocale();
  return (
    <div className='px-2 md:px-4'>
      <PortalTitle title={dict.portalNavigation.links.home} />
    </div>
  );
}
