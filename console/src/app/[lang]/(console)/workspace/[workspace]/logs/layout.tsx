import type { Metadata } from 'next';

import type { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import { fetchWorkspaceMeta } from '@/lib/core/serverFetchers';
import { getServerDict } from '@/lib/dict/server';
import { buildTitle, buildTitleTemplate } from '@/lib/metadata';

/**
 * Logs layer metadata. Injects "Logs" as a middle segment between the leaf
 * entity's name (set by a nested layout, e.g. repository/[repository]) and
 * the workspace suffix, yielding titles like
 * "demo-data – Logs – Tim's Office · Irmin".
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace } = await props.params;
  const dict = getServerDict(lang);
  const ws = await fetchWorkspaceMeta(lang, workspace);
  // Match the workspace layout's ellipsis fallback on fetch failure.
  const wsName = ws?.name ?? `${workspace}…`;
  const logs = dict.metadata.sections.logs;
  return {
    title: {
      default: buildTitle([logs, wsName]),
      template: buildTitleTemplate([logs, wsName]),
    },
  };
}

/**
 * Layout for the Logs pages in the Console
 */
export default async function ConsoleLogsLayout(props: {
  params: Promise<WorkspaceLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
