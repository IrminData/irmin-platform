'use client';

import DocumentationEditor from '@/components/repository/viewer/DocumentationEditor';

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
  const {
    repositories: { repositories },
  } = useWorkspace();

  const repository = repositories.find(
    (repo) => repo.slug === params.repository
  );

  if (!repository) return <></>;

  return (
    <>
      <div className='px-2 md:px-4'>
        <DocumentationEditor repository={repository} />
      </div>
    </>
  );
}
