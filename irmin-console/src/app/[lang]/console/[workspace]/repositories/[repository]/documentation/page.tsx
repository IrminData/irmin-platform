'use client';

import RepositoryDocumentationSection from '@/components/repository/RepositoryDocumentationSection';

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
    (item) => item.slug === params.repository
  );

  if (!repository) return <></>;

  return <RepositoryDocumentationSection repository={repository} />;
}
