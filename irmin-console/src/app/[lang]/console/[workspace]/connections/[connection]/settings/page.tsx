'use client';

import ConnectionSettingsSection from '@/components/connection/ConnectionSettingsSection';

import { useWorkspace } from '@/context/workspace';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection settings
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function ConnectionSettingsPage({
  params,
}: {
  params: SingleConnectionLayoutParams;
}) {
  const connectionSlug = params.connection;

  const {
    connections: { connections },
  } = useWorkspace();

  const connection = connections.find((item) => item.slug === connectionSlug);
  if (!connection) return <></>;

  return <ConnectionSettingsSection connection={connection} />;
}
