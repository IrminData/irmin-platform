'use client';

import ConnectionSection from '@/components/connection/ConnectionSection';

import { useWorkspace } from '@/context/workspace';

import { SingleConnectionLayoutParams } from './layout';

/**
 * Page for the Connection overview
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function ConnectionOverviewPage({
  params,
}: {
  params: SingleConnectionLayoutParams;
}) {
  const connectionID = params.connection;

  const {
    connections: { connections },
  } = useWorkspace();

  const connection = connections.find((item) => item.id === connectionID);
  if (!connection) return <></>;

  return <ConnectionSection connection={connection} />;
}
