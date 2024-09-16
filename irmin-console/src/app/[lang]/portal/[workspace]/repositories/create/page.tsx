'use client';

import { useRouter } from 'next/navigation';

import RepositoriesSection from '@/components/repository/RepositoriesSection';

/**
 * Page to create a new Repository in the workspace
 *
 * Uses {@link RepositoriesSection} to provide UI for new Repository creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the repositories page.
 */
export default function RepositoryCreatePage() {
  const router = useRouter();
  return (
    <RepositoriesSection
      sideModalOpen={true}
      onModalClose={() => {
        router.push('../repositories');
      }}
    />
  );
}
