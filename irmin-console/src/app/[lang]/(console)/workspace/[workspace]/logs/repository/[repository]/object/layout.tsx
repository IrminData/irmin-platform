import type { Metadata } from 'next';

import { fetchRepositoryMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import { getServerDict } from '@/lib/dict/server';

/**
 * URL parameters for the Repository Object Logs layout
 */
export type RepositoryObjectLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

export async function generateMetadata(props: {
  params: Promise<RepositoryObjectLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, repository } = await props.params;
  const dict = getServerDict(lang);
  const repo = await fetchRepositoryMeta(lang, workspace, repository);
  const repoName = repo?.name ?? `${repository}…`;
  return { title: `${dict.metadata.resource.object} – ${repoName}` };
}

/**
 * Layout for the Repository Object Logs pages in the Console
 */
export default async function RepositoryObjectLogsLayout(props: {
  params: Promise<RepositoryObjectLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
