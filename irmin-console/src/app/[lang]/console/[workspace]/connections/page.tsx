import { getConnections } from '@/lib/actions/connections';
import { getConnectors } from '@/lib/actions/connectors';

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
export default async function ConnectionsPage() {
  const [connectors, connections] = await Promise.all([
    getConnectors(),
    getConnections(),
  ]);
  return (
    <ConnectionsSection
      connections={connections}
      connectors={connectors}
      sideModalOpen={false}
    />
  );
}
