import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Repository Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param repository - The slug of the repository to show logs for
 */
export type RepositoryLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

/**
 * SEO metadata for the Repository Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<RepositoryLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Repository logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
