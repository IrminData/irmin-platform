'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import DocumentationEditor from '@/components/repository/DocumentationEditor';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository documentation
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function RepositoryDocumentationPage({
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
        <PortalTitle title={dict.repository.tabs.documentation} />
        <DocumentationEditor repository={repository} />
      </div>
    </div>
  );
}
