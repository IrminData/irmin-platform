'use client';

import { useMemo } from 'react';

import RepositoryBranchesSection from '@/components/repository/RepositoryBranchesSection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository branches.
 */
export default function RepositoryBranchesPage({
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

  if (!repository) return <></>;

  return <RepositoryBranchesSection repository={repository} />;
}
