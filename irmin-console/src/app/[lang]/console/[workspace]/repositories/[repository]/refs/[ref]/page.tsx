'use client';

import RepositorySection from '@/components/repository/RepositorySection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRefRouteParams } from './layout';

/**
 * Page for the Repository ref data viewer, like tag or specific commit.
 *
 * Uses {@link RepositorySection} to display the Repository viewer
 *
 * The repository section is set to immutable, in order to prevent
 * for example collection uploads.
 *
 * The ref is set in the data context from the route params.
 */
export default function RepositoryRefPage({
  params,
}: {
  params: RepositoryRefRouteParams;
}) {
  const {
    repositories: { repositories },
  } = useWorkspace();

  const repository = repositories.find(
    (item) => item.slug === params.repository
  );

  return (
    <RepositorySection
      repository={repository}
      initialRef={params.ref}
      immutable={true}
    />
  );
}
