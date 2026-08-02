import type { Metadata } from 'next';

import { fetchConnectionMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Connection Logs layout
 */
export type ConnectionLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  connection: string;
};

export async function generateMetadata(props: {
  params: Promise<ConnectionLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, connection } = await props.params;
  const conn = await fetchConnectionMeta(lang, workspace, connection);
  // Truncate the slug fallback to 8 chars to match every other ID-based
  // log layout (workflow, query, user, policy). Connection IDs are UUIDs.
  return { title: conn?.name ?? `${connection.slice(0, 8)}…` };
}

/**
 * Layout for the Connection Logs pages in the Console
 */
export default async function ConnectionLogsLayout(props: {
  params: Promise<ConnectionLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
