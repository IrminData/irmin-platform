import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Query Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param query - The ID of the query to show logs for
 */
export type QueryLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  query: string;
};

/**
 * SEO metadata for the Query Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<QueryLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Query logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
