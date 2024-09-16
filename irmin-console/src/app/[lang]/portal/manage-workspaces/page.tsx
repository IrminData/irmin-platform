'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import ManageWorkspacesSection from '@/components/workspace/ManageWorkspacesSection';

import { useLocale } from '@/context/LocaleContext';

/**
 * Portal home page
 *
 * It uses the {@link ManageWorkspacesSection} component to display the workspace management UI.
 */
const ManageWorkspacesPage: React.FC = () => {
  const { dict } = useLocale();

  return (
    <>
      <PortalTitle title={dict.workspaceSwitcher.manageWorkspaces} />
      <ManageWorkspacesSection />
    </>
  );
};

export default ManageWorkspacesPage;
