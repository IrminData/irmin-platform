'use client';

import { useMemo } from 'react';

import RepositoryCollectionsSettingsSection from '@/components/repository/RepositoryCollectionsSettingsSection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../../layout';

/**
 * Page for the Repository collections settings.
 * Select which collections are part of the repository.
 */
export default function RepositoryCollectionsSettingsPage({
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

  return <RepositoryCollectionsSettingsSection repository={repository} />;
}
