import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import {
  fetchConnectionMeta,
  fetchWorkspaceMeta,
} from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import {
  buildTitle,
  buildTitleTemplate,
  clampDescription,
} from '@/lib/metadata';

import ConnectionLayoutWrapper from '@/components/connection/ConnectionLayoutWrapper';

import { ConnectionProvider } from '@/context/ConnectionContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * URL parameters for the single Connection pages layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param connection - The slug of the connection to show
 */
export type SingleConnectionLayoutParams = {
  lang: Locale;
  workspace: string;
  connection: string;
};

/**
 * Connection layer metadata. Fetches the real connection name so subpages
 * (connector, schema, settings, …) compose their titles against it.
 */
export async function generateMetadata(props: {
  params: Promise<SingleConnectionLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, connection } = await props.params;
  const [ws, conn] = await Promise.all([
    fetchWorkspaceMeta(lang, workspace),
    fetchConnectionMeta(lang, workspace, connection),
  ]);
  // Match the workspace layout's ellipsis fallback so composed titles stay
  // visually consistent when either fetch fails.
  const wsName = ws?.name ?? `${workspace}…`;
  // Truncate the slug fallback to match the other ID-based layouts (workflow,
  // AI application) — connection IDs are UUIDs, and a raw 36-char fallback
  // would blow past the title budget before the workspace suffix is added.
  const connName = conn?.name ?? `${connection.slice(0, 8)}…`;
  return {
    title: {
      default: buildTitle([connName, wsName]),
      template: buildTitleTemplate([connName, wsName]),
    },
    description: clampDescription(conn?.description, `Connection in ${wsName}`),
  };
}

/**
 * Layout for the single connection pages in the Console
 */
export default async function ConnectionPagesLayout(props: {
  children: React.ReactNode;
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;

  const { children } = props;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) {
    notFound();
  }

  return (
    <ConnectionProvider connectionID={connectionID}>
      <ConnectionLayoutWrapper>{children}</ConnectionLayoutWrapper>
    </ConnectionProvider>
  );
}
