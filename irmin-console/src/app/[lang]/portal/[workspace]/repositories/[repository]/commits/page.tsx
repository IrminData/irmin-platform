'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Page for the Repository commits.
 */
export default function RepositoryCommitsPage() {
  const { dict } = useLocale();

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='px-2 md:px-4'>
        <PortalTitle title={dict.repository.tabs.commits} />
      </div>
    </div>
  );
}
