'use client';

import { useMemo } from 'react';

import RepositoryStructureSection from '@/components/repository/RepositoryStructureSection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository structure viewing, like the schema.
 */
export default function RepositoryStructurePage({
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

  return <RepositoryStructureSection repository={repository} />;
}
