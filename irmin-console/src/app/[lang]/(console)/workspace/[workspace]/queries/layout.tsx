import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

import { QueryProvider } from '@/context/QueryContext';

/**
 * URL parameters for the Queries layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type QuriesLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Queries layout
 */
export async function generateMetadata(props: {
  params: Promise<QuriesLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Queries | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Queries page in the Console
 * @param children - The children to render
 */
export default async function QueriesLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<QuriesLayoutParams>;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
