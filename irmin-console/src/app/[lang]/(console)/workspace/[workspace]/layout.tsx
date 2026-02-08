'use server';

import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

import { PopupOutlet } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

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
 * Provides the {@link WorkspaceProvider} context for the workspace pages.
 *
 * The {@link PopupOutlet} is placed inside the {@link WorkspaceProvider} so that
 * popup content (modals, alerts, confirms) has access to workspace context.
 * It takes over rendering from the root {@link PopupProvider} while this layout is mounted.
 */
export default async function ConsoleWorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const { children } = props;

  const workspaceSlug = params.workspace;

  return (
    <WorkspaceProvider workspaceSlug={workspaceSlug}>
      {children}
      <PopupOutlet />
    </WorkspaceProvider>
  );
}
