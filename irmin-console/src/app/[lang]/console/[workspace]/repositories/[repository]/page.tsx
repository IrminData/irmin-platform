'use client';

import { useMemo } from 'react';

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
  const repository = useMemo(
    () => repositories.find((repo) => repo.slug === params.repository),
    [params.repository, repositories]
  );
  return <RepositorySection repository={repository} />;
}
