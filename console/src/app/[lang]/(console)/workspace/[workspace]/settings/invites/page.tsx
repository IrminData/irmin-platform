import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceInvitesSection from '@/components/workspace/WorkspaceInvitesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.invites };
}

/**
 * Console Workspace invites page
 */
export default function WorkspaceInvitesPage() {
  return <WorkspaceInvitesSection />;
}
