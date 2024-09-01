import type { Metadata } from 'next';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';

import { BucketProvider } from '@/context/BucketContext';

export type WorkspaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * Generate default SEO metadata for the portal workspace pages.
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workspace ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Portal workspace layout
 * Provides the {@link BucketProvider} context for the workspace.
 */
export default function PortalWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: WorkspaceLayoutParams;
}) {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;
  const currentWorkspace = params.workspace;
  return (
    <BucketProvider locale={lang} currentWorkspace={currentWorkspace}>
      {children}
    </BucketProvider>
  );
}
