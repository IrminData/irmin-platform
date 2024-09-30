'use client';

import RepositorySection from '@/components/repository/RepositorySection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from './layout';

/**
 * Page for the Repository viewer
 *
 * Uses {@link RepositorySection} to display the Repository viewer
 */
export default function RepositoryPage({
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

  return <RepositorySection repository={repository} initialRef={''} />;
}
