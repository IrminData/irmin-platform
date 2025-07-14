import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Repository Object Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param repository - The slug of the repository to show logs for
 */
export type RepositoryObjectLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

/**
 * SEO metadata for the Repository Object Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<RepositoryObjectLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Repository object logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
