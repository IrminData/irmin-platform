import type { Metadata } from 'next';

import { fetchWorkspaceMeta } from '@/lib/core/serverFetchers';
import { getServerDict } from '@/lib/dict/server';
import { buildTitle, buildTitleTemplate } from '@/lib/metadata';

import WorkspaceSettingsLayoutWrapper from '@/components/workspace/WorkspaceSettingsLayoutWrapper';

import type { WorkspaceLayoutParams } from '../layout';

/**
 * Settings layer metadata. Injects the literal "Settings" segment between
 * the leaf page title and the workspace suffix so subpages
 * (billing, users, …) compose to e.g. "Billing – Settings – Tim's Office".
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace } = await props.params;
  const dict = getServerDict(lang);
  const ws = await fetchWorkspaceMeta(lang, workspace);
  // Match the workspace layout's ellipsis fallback on fetch failure.
  const wsName = ws?.name ?? `${workspace}…`;
  const settings = dict.metadata.sections.settings;
  return {
    title: {
      default: buildTitle([settings, wsName]),
      template: buildTitleTemplate([settings, wsName]),
    },
  };
}

/**
 * Layout for the Workspace settings pages in the Console
 */
export default function WorkspaceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
  params: WorkspaceLayoutParams;
}) {
  return (
    <WorkspaceSettingsLayoutWrapper>{children}</WorkspaceSettingsLayoutWrapper>
  );
}
