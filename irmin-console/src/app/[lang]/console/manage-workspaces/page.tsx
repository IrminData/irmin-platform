'use client';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

import { useLocale } from '@/context/LocaleContext';

/**
 * Console home page
 *
 * It uses the {@link ManageWorkspacesSection} component to display the workspace management UI.
 */
const ManageWorkspacesPage: React.FC = () => {
  const { dict } = useLocale();

  return (
    <>
      <ConsoleTitle title={dict.workspaceSwitcher.manageWorkspaces} />
      <ManageWorkspacesSection />
    </>
  );
};

export default ManageWorkspacesPage;
