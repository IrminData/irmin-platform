import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getWorkspaces } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

/**
 * SEO metadata for the Manage Workspaces pages
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Manage workspaces | IRMIN Console`,
  };
}

/**
 * Console home page
 *
 * It uses the {@link ManageWorkspacesSection} component to display the workspace management UI.
 */
const ManageWorkspacesPage = async () => {
  const token = await getToken();
  const workspaces = await getWorkspaces({ token });
  if (!workspaces || !workspaces.data) return notFound();
  return <ManageWorkspacesSection initialWorkspaces={workspaces.data} />;
};

export default ManageWorkspacesPage;
