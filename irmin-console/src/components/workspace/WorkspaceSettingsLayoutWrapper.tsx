'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';
import { TbInvoice, TbSettings, TbUser } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

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
        title: dict.workspace.general,
        href: `${workspaceUrl}/settings`,
        active: pathname === `${workspaceUrl}/settings`,
        icon: <TbSettings size={14} />,
      },
      {
        title: dict.workspace.users,
        href: `${workspaceUrl}/settings/users`,
        active: pathname === `${workspaceUrl}/settings/users`,
        icon: <TbUser size={14} />,
      },
      {
        title: dict.workspace.billing,
        href: `${workspaceUrl}/settings/billing`,
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
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='light'
            className='bg-gray-100 dark:bg-gray-700'
            icon={<IoChevronBack size={24} />}
            href={`${workspaceUrl}/home`}
          />
          {tabs
            .map((tab, idx) => {
              return (
                <Button
                  key={`workspace-settings-tab-${idx}`}
                  className={`rounded-none border-irmin_green px-2 hover:no-underline lg:px-1 ${tab.active ? 'border-b-2' : 'border-0'}`}
                  size='sm'
                  variant='link'
                  colorScheme={tab.active ? 'primary' : 'gray'}
                  href={tab.href}
                  ariaLabel={`Tab ${tab.title}`}
                  icon={tab.icon}
                >
                  {tab.title}
                </Button>
              );
            })
            .filter((tab) => tab)}
        </div>
      </div>
      <div>{children}</div>
    </>
  );
}
