import type { Metadata } from 'next';

import type { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import { getServerDict } from '@/lib/dict/server';

export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.assistant };
}

/**
 * Layout for the Assistant pages in the Console
 */
export default function ConsoleAssistantLayout({
  children,
}: Readonly<{
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}>) {
  return children;
}
