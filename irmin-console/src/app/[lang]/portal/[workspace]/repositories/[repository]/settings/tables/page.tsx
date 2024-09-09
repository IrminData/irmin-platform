'use client';

import { useMemo } from 'react';

import RepositoryTableSettingsSection from '@/components/repository/RepositoryTableSettingsSection';

import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../../layout';

/**
 * Page for the Repository tables settings
 */
export default function RepositoryTablesSettingsPage({
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

  return <RepositoryTableSettingsSection repository={repository} />;
}
