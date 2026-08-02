import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceApiMcpSection from '@/components/workspace/WorkspaceApiMcpSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.apiMcp };
}

/**
 * Console Workspace API/MCP settings page
 */
export default function WorkspaceApiMcpSettingsPage() {
  return <WorkspaceApiMcpSection />;
}
