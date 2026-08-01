import type { Metadata } from 'next';

import { fetchWorkspaceMeta } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import {
  buildTitle,
  buildTitleTemplate,
  clampDescription,
  SITE_NAME,
} from '@/lib/metadata';

import { PopupOutlet } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

export type WorkspaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * Workspace layer metadata.
 *
 * Fetches the real workspace name via the same core service the page
 * component uses — `React.cache()` dedupes so we only pay for one request
 * per render pass. Every descendant resource layout composes its title
 * against the template declared here, so the workspace name flows through
 * to every tab title and share preview in the subtree.
 *
 * Falls back to a slug-derived placeholder with a trailing ellipsis when
 * the fetch fails (auth, 404, network). Never throws — page-level error
 * boundaries handle recovery UX.
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace } = await props.params;
  const ws = await fetchWorkspaceMeta(lang, workspace);
  const name = ws?.name ?? `${workspace}…`;
  return {
    title: {
      default: buildTitle([name]),
      template: buildTitleTemplate([name]),
    },
    description: clampDescription(ws?.description, `${name} on ${SITE_NAME}`),
  };
}

/**
 * Console workspace layout. Provides WorkspaceProvider context and mounts
 * PopupOutlet inside the provider so popup content can reach workspace state.
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
