import { getDict } from '@/lib/actions/dict';
import { getWorkspaces } from '@/lib/actions/workspaces';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

/**
 * Console home page
 *
 * It uses the {@link ManageWorkspacesSection} component to display the workspace management UI.
 */
const ManageWorkspacesPage = async () => {
  const [{ dict }, workspaces] = await Promise.all([
    getDict(),
    getWorkspaces(),
  ]);

  return (
    <>
      <ConsoleTitle title={dict.workspaceSwitcher.manageWorkspaces} />
      <ManageWorkspacesSection initialWorkspaces={workspaces} dict={dict} />
    </>
  );
};

export default ManageWorkspacesPage;
