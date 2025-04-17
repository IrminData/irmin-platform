import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

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
 * SEO metadata for the single connection pages layout
 */
export async function generateMetadata(props: {
  params: Promise<SingleConnectionLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Connection | ${formattedWorkspace} | IRMIN Console`,
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
  const currentWorkspace = params.workspace;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) {
    notFound();
  }

  const token = await getToken();
  const connection = await getConnection({
    workspace: currentWorkspace,
    connectionID,
    token,
  });

  if (!connection.data) return notFound();

  return (
    <ConnectionProvider
      workspaceSlug={currentWorkspace}
      defaultConnection={connection.data}
      connectionID={connectionID}
    >
      <ConnectionLayoutWrapper>{children}</ConnectionLayoutWrapper>
    </ConnectionProvider>
  );
}
