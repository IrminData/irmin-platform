import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Connection Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param connection - The ID of the connection to show logs for
 */
export type ConnectionLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  connection: string;
};

/**
 * SEO metadata for the Connection Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<ConnectionLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Connection logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
