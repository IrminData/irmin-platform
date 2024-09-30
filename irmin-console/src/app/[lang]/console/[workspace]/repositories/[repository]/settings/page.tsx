'use client';

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

  const repository = repositories.find(
    (item) => item.slug === params.repository
  );

  return <RepositorySettingsSection repository={repository} />;
}
