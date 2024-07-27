'use client';

import ManageWorkspaces from '@/components/manageWorkspaces';
import PortalTitle from '@/components/portalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Portal home page
 *
 * It uses the {@link ManageWorkspaces} component to display the workspace management UI.
 */
const PortalHome: React.FC = () => {
  const { dict } = useLocale();

  return (
    <>
      <PortalTitle
        title={dict.workspaceSwitcher.manageWorkspaces}
        props={{
          className: 'text-center mx-auto',
        }}
      />
      <ManageWorkspaces />
    </>
  );
};

export default PortalHome;
