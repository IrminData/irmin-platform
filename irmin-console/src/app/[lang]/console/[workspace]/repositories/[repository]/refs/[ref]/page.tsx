'use client';

import { useEffect, useMemo } from 'react';

import RepositorySection from '@/components/repository/RepositorySection';

import { useData } from '@/context/DataContext';
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
  const repository = useMemo(
    () => repositories.find((repo) => repo.slug === params.repository),
    [params.repository, repositories]
  );

  // Set the current ref in the data context
  const { setCurrentRef } = useData();
  useEffect(() => {
    setCurrentRef(params.ref);
  }, [setCurrentRef, params.ref]);

  return <RepositorySection repository={repository} immutable={true} />;
}
