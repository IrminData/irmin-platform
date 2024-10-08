'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { TbInvoice, TbSettings, TbUser } from 'react-icons/tb';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Component to wrap the Workspace Settings pages in.
 * Provides tabs and title.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function WorkspaceSettingsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const tabs = useMemo(
    () => [
      {
        name: dict.workspace.general,
        link: `${workspaceUrl}/settings`,
        active: pathname === `${workspaceUrl}/settings`,
        icon: <TbSettings size={14} />,
      },
      {
        name: dict.workspace.users,
        link: `${workspaceUrl}/settings/users`,
        active: pathname === `${workspaceUrl}/settings/users`,
        icon: <TbUser size={14} />,
      },
      {
        name: dict.workspace.billing,
        link: `${workspaceUrl}/settings/billing`,
        active: pathname === `${workspaceUrl}/settings/billing`,
        icon: <TbInvoice size={14} />,
      },
    ],
    [pathname, dict, workspaceUrl]
  );

  if (!currentWorkspace) {
    return (
      <div className='container relative mx-auto max-w-6xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-8 flex w-full flex-col gap-2 px-2 md:px-4'>
          <h1 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
            {dict.consoleNavigation.links.workspaceSettings}
          </h1>
          <p className='max-w-lg text-base text-gray-400 lg:text-lg'>
            {currentWorkspace.name}
          </p>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/home`}
          backTooltip={dict.consoleNavigation.workspace}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
