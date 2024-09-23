'use client';

import { useRouter } from 'next/navigation';

import ConnectionsSection from '@/components/connection/ConnectionsSection';

/**
 * Page to create a new Connection in the workspace
 *
 * Uses {@link ConnectionsSection} to provide UI for new Connection creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the connections page.
 */
export default function ConnectionCreatePage() {
  const router = useRouter();
  return (
    <ConnectionsSection
      sideModalOpen={true}
      onModalClose={() => {
        router.push('../connections');
      }}
    />
  );
}
