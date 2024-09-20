'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import { IoChevronBack } from 'react-icons/io5';
import { TbFileText, TbSettings } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Component to wrap the single Connection pages in.
 *
 * @param children - The children to render
 */
export default function ConnectionLayoutWrapper({
  children,
  connectionSlug,
}: {
  children: React.ReactNode;
  connectionSlug: string;
}) {
  const currentPath = usePathname();
  const { dict, locale } = useLocale();
  const {
    connections: { connections },
    workspaces: { currentWorkspace },
  } = useWorkspace();

  const connection = useMemo(
    () => connections.find((item) => item.slug === connectionSlug),
    [connectionSlug, connections]
  );

  const workspaceSlug = useMemo(
    () => currentWorkspace?.slug ?? '',
    [currentWorkspace]
  );

  const tabs = useMemo(
    () => [
      {
        title: dict.connections.tabs.overview,
        href: `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}`,
        icon: <GoWorkflow size={14} />,
        hide: false,
      },
      {
        title: dict.connections.tabs.documentation,
        href: `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}/documentation`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}/documentation`,
        icon: <TbFileText size={14} />,
        hide: false,
      },
      {
        title: dict.connections.tabs.settings,
        href: `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}/settings`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/connections/${connection?.slug}/settings`,
        icon: <TbSettings size={14} />,
        hide: false,
      },
    ],
    [currentPath, dict, locale, connection, workspaceSlug]
  );

  if (!connection) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
          <div className='flex flex-col gap-2 py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-sm text-gray-400'>
                  {dict.connections.connection}
                </span>
                <span className='rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {connection.connector.name}
                </span>
              </div>
              <span className='px-2 text-sm text-gray-400'>
                {dict.list.owner}: {connection.owner.name}
                {connection.owner.company
                  ? ` (${connection.owner.company})`
                  : ''}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg font-normal text-irmin_black md:text-2xl dark:text-white'>
                {connection.name}
              </h1>
            </div>
            <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
              {connection.description}
            </p>
          </div>
        </div>
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4 md:gap-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='black'
            className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
            href={`/${locale}/portal/${workspaceSlug}/connections`}
          >
            <IoChevronBack size={24} />
          </Button>
          {tabs
            .map((tab, idx) => {
              if (tab.hide) return null;
              return (
                <Button
                  key={`connection-tab-${idx}`}
                  className={`rounded-none border-irmin_green px-2 hover:no-underline lg:px-0 ${tab.active ? 'border-b-2' : 'border-0'}`}
                  size='sm'
                  variant='link'
                  colorScheme={tab.active ? 'primary' : 'gray'}
                  href={tab.href}
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
