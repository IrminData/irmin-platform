'use client';

import { useRouter } from 'next/navigation';

import RepositoriesSection from '@/components/repository/RepositoriesSection';

/**
 * Repositories page in the workspace
 *
 * Uses {@link RepositoriesSection} to provide UI to list repositories
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function RepositoriesPage() {
  const router = useRouter();
  return (
    <RepositoriesSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('repositories/create');
      }}
      onModalClose={() => {}}
    />
  );
}
