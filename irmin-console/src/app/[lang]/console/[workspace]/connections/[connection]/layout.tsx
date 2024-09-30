import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';

import ConnectionLayoutWrapper from '@/components/connection/ConnectionLayoutWrapper';

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
export async function generateMetadata({
  params,
}: {
  params: SingleConnectionLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedConnection = params.connection.replace(/-/g, ' ');
  return {
    title: `Connection ${formattedConnection} | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the single connection pages in the Console
 */
export default function ConnectionPagesLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: SingleConnectionLayoutParams;
}>) {
  const connection = params.connection;
  if (isInvalidRouteProp(connection)) {
    notFound();
  }
  return (
    <ConnectionLayoutWrapper
      connectionSlug={connection}
      workspaceSlug={params.workspace}
    >
      {children}
    </ConnectionLayoutWrapper>
  );
}
