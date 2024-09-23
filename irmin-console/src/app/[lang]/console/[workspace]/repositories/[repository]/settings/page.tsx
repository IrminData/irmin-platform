'use client';

import { useMemo } from 'react';

import RepositorySettingsSection from '@/components/repository/RepositorySettingsSection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository settings
 */
export default function RepositorySettingsPage({
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

  return <RepositorySettingsSection repository={repository} />;
}
