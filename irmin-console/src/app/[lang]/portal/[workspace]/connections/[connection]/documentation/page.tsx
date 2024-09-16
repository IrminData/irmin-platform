'use client';

import { useMemo } from 'react';

import ConnectionDocumentationSection from '@/components/connection/ConnectionDocumentationSection';

import { useWorkspace } from '@/context/workspace';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection documentation
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function ConnectionDocumentationPage({
  params,
}: {
  params: SingleConnectionLayoutParams;
}) {
  const connectionSlug = params.connection;

  const {
    connections: { connections },
  } = useWorkspace();
  const connection = useMemo(
    () => connections.find((item) => item.slug === connectionSlug),
    [connectionSlug, connections]
  );
  if (!connection) return <></>;

  return <ConnectionDocumentationSection connection={connection} />;
}
