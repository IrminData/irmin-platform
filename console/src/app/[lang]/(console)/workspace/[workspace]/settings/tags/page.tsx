import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceTagsSection from '@/components/workspace/WorkspaceTagsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.tags };
}

/**
 * Workspace tags settings page
 */
const WorkspaceTagsPage = () => {
  return <WorkspaceTagsSection />;
};

export default WorkspaceTagsPage;
