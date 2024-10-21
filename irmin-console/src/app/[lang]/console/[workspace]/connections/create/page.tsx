import { getConnections } from '@/lib/actions/connections';
import { getConnectors } from '@/lib/actions/connectors';

import ConnectionsSection from '@/components/connection/ConnectionsSection';

/**
 * Page to create a new Connection in the workspace
 *
 * Uses {@link ConnectionsSection} to provide UI for new Connection creation with a pre-opened side modal.
 * If the user tries to close the modal, it navigates back to the connections page.
 */
export default async function ConnectionCreatePage() {
  const [connectors, connections] = await Promise.all([
    getConnectors(),
    getConnections(),
  ]);

  return (
    <ConnectionsSection
      connections={connections}
      connectors={connectors}
      sideModalOpen={true}
    />
  );
}
