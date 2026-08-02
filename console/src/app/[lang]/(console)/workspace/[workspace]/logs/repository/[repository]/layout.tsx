import type { Metadata } from 'next';

import { fetchRepositoryMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Repository Logs layout
 */
export type RepositoryLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

export async function generateMetadata(props: {
  params: Promise<RepositoryLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, repository } = await props.params;
  const repo = await fetchRepositoryMeta(lang, workspace, repository);
  return { title: repo?.name ?? `${repository}…` };
}

/**
 * Layout for the Repository Logs pages in the Console
 */
export default async function RepositoryLogsLayout(props: {
  params: Promise<RepositoryLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
