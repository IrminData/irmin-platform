'use client';

import Image from 'next/image';

import ManageWorkspaces from '@/components/manage-workspaces/manage';

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
      <div
        className={`px-4 pb-8 pt-14 text-center text-lg font-medium text-irmin_black text-opacity-80 md:pb-8 md:pt-12 md:text-3xl`}
      >
        <Image
          src='/irmin-logo.svg'
          alt='Irmin'
          width={200}
          height={50}
          className={`mx-auto mb-4 h-8 md:h-16`}
        />
        <h1>{dict.workspaceSwitcher.manageWorkspaces}</h1>
      </div>
      <ManageWorkspaces />
    </>
  );
};

export default PortalHome;
