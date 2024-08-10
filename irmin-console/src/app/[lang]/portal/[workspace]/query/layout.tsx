import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import QueryLayoutWrapper from '@/components/query/QueryLayoutWrapper';

/**
 * URL parameters for the Query layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type QueryLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Query layout
 */
export async function generateMetadata({
  params,
}: {
  params: QueryLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Query | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Query page in the Portal
 * @param children - The children to render
 */
export default function QueryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  params: QueryLayoutParams;
}>) {
  return <QueryLayoutWrapper>{children}</QueryLayoutWrapper>;
}
