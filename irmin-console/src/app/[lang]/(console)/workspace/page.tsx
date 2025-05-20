import { Metadata } from 'next';

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
  return <ManageWorkspacesSection />;
};

export default ManageWorkspacesPage;
