import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceUsersSection from '@/components/workspace/WorkspaceUsersSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.users };
}

/**
 * Console Workspace users page
 */
export default function WorkspaceUsersPage() {
  return <WorkspaceUsersSection />;
}
