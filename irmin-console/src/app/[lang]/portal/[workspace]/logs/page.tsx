'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Logs page - home page for all logs
 *
 * @todo Implement this page and UI
 */
export default function LogsPage() {
  const { dict } = useLocale();
  return (
    <div className='px-2 md:px-4'>
      <PortalTitle title={dict.portalNavigation.links.logs} />
    </div>
  );
}
