import { notFound } from 'next/navigation';

import { getWorkspaces } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

/**
 * Console home page
 *
 * It uses the {@link ManageWorkspacesSection} component to display the workspace management UI.
 */
const ManageWorkspacesPage = async () => {
  const token = await getToken();
  const workspaces = await getWorkspaces(token);

  if (!workspaces) {
    return notFound();
  }

  return <ManageWorkspacesSection initialWorkspaces={workspaces} />;
};

export default ManageWorkspacesPage;
