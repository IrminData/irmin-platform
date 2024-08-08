'use client';

import Image from 'next/image';

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
      <ManageWorkspacesSection />
    </>
  );
};

export default ManageWorkspacesPage;
