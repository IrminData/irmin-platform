'use client';

import { useRouter } from 'next/navigation';

import ConnectionsSection from '@/components/connection/ConnectionsSection';

/**
 * Connections page in the workspace
 *
 * Uses {@link ConnectionsSection} to provide UI to list connections
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function ConnectionsPage() {
  const router = useRouter();
  return (
    <ConnectionsSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('connections/create');
      }}
      onModalClose={() => {}}
    />
  );
}
