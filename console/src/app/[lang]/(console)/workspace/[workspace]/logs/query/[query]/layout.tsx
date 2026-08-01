import type { Metadata } from 'next';

import { fetchQueryMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Query Logs layout
 */
export type QueryLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  query: string;
};

export async function generateMetadata(props: {
  params: Promise<QueryLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, query } = await props.params;
  const q = await fetchQueryMeta(lang, workspace, query);
  return { title: q?.name ?? `${query.slice(0, 8)}…` };
}

/**
 * Layout for the Query Logs pages in the Console
 */
export default async function QueryLogsLayout(props: {
  params: Promise<QueryLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
