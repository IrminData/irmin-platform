import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';
import { SITE_NAME } from '@/lib/metadata';

import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

type ManageWorkspacesParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<ManageWorkspacesParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return {
    // Sits above the [workspace] layer, so there's no workspace suffix to
    // splice in — the full title is spelled out here rather than composed
    // through the root `%s · Irmin` template.
    title: {
      absolute: `${dict.metadata.workspace.select} · ${SITE_NAME}`,
    },
  };
}

/**
 * Workspace selector landing page.
 */
const ManageWorkspacesPage = async () => {
  return <ManageWorkspacesSection />;
};

export default ManageWorkspacesPage;
