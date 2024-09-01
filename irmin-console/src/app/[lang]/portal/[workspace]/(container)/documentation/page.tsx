'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Page to show the full documentation for the workspace
 *
 * @todo Implement this page and UI
 */
export default function DocumentationPage() {
  const { dict } = useLocale();

  return (
    <div className='px-2 md:px-4'>
      <PortalTitle title={dict.portalNavigation.links.documentation} />
    </div>
  );
}
