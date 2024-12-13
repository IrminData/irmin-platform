import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getConnectors } from '@/lib/actions/connectors';
import { getToken } from '@/lib/getToken';

import ConnectionsSection from '@/components/connection/ConnectionsSection';

/**
 * Page to create a new Connection in the workspace
 *
 * Uses {@link ConnectionsSection} to provide UI for new Connection creation with a pre-opened side modal.
 * If the user tries to close the modal, it navigates back to the connections page.
 */
export default async function ConnectionCreatePage() {
  const token = await getToken();
  const [connectors, connections] = await Promise.all([
    getConnectors(token),
    getConnections(token),
  ]);
  if (!connections || !connectors) return notFound();
  return (
    <ConnectionsSection
      connections={connections}
      connectors={connectors}
      sideModalOpen={true}
    />
  );
}
