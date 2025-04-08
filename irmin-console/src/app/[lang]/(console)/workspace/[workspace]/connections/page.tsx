import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getConnectors } from '@/lib/actions/connectors';
import { getToken } from '@/lib/getToken';

import ConnectionsSection from '@/components/connection/ConnectionsSection';

import { WorkspaceLayoutParams } from '../layout';

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
export default async function ConnectionsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const [connectors, connections] = await Promise.all([
    getConnectors({ token }),
    getConnections({ workspace: currentWorkspace, token }),
  ]);
  return (
    <ConnectionsSection
      connections={connections.data ?? []}
      connectors={connectors.data ?? []}
      sideModalOpen={false}
    />
  );
}
