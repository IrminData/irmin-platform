import type { Metadata } from 'next';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';

import { BucketProvider } from '@/context/BucketContext';

export type WorkspaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * Generate default SEO metadata for the console workspace pages.
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workspace ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Console workspace layout
 * Provides the {@link BucketProvider} context for the workspace.
 */
export default async function ConsoleWorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const { children } = props;

  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;
  const currentWorkspace = params.workspace;
  return (
    <BucketProvider locale={lang} currentWorkspace={currentWorkspace}>
      {children}
    </BucketProvider>
  );
}
