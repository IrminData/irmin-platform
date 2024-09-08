'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository commits.
 */
export default function RepositoryCommitsPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const { dict } = useLocale();
  const {
    repositories: { repositories },
  } = useWorkspace();

  const repository = repositories.find(
    (repo) => repo.slug === params.repository
  );

  if (!repository) return <></>;

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='px-2 md:px-4'>
        <PortalTitle title={dict.repository.tabs.commits} />
      </div>
    </div>
  );
}
