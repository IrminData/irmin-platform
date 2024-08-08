'use client';

import { usePathname } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Component to wrap the Repository pages in.
 * Provides tabs and title for the repository.
 *
 * @param children - The children to render
 */
export default function RepositoryLayoutWrapper({
  children,
  repoSlug,
}: {
  children: React.ReactNode;
  repoSlug: string;
}) {
  const currentPath = usePathname();
  const { locale, dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();

  if (!currentWorkspace) return <></>;

  const workspaceSlug = currentWorkspace.slug ?? '';
  const tabs = [
    {
      title: dict.repository.tabs.dataViewer,
      href: `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}`,
      active:
        currentPath ===
        `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}`,
    },
    {
      title: dict.repository.tabs.documentation,
      href: `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/documentation`,
      active:
        currentPath ===
        `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/documentation`,
    },
    {
      title: dict.repository.tabs.workflows,
      href: `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/workflows`,
      active:
        currentPath ===
        `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/workflows`,
    },
    {
      title: dict.repository.tabs.settings,
      href: `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/settings`,
      active:
        currentPath ===
        `/${locale}/portal/${workspaceSlug}/repositories/${repoSlug}/settings`,
    },
  ];

  return (
    <>
      <div className='mx-auto w-full px-2 md:px-4'>
        <div className='flex flex-col gap-2 py-4'>
          <span className='text-sm text-gray-400'>
            {dict.repository.repository}
          </span>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-lg font-normal text-irmin_black md:text-2xl'>
              {currentWorkspace.slug}/{repoSlug}
            </h1>
            <StatusBadge accessStatus={'private'} statusLabel={'Private'} />
          </div>
        </div>
      </div>
      <div className='scrollbar-hide mb-6 flex w-full max-w-2xl justify-start gap-2 overflow-y-scroll px-4 md:gap-4'>
        <Button
          size='sm'
          variant='icon'
          colorScheme='black'
          className='aspect-square h-auto w-auto rounded-full bg-gray-100'
          href={`/${locale}/portal/${workspaceSlug}/repositories`}
          ariaLabel='Back to Repositories'
        >
          <IoChevronBack size={24} />
        </Button>
        {tabs.map((tab, idx) => (
          <Button
            key={`data-repo-tab-${idx}`}
            className={`rounded-none border-irmin_green hover:no-underline ${tab.active ? 'border-b-2' : 'border-0'}`}
            size='sm'
            variant='link'
            colorScheme={tab.active ? 'primary' : 'gray'}
            href={tab.href}
            ariaLabel={`Open ${tab.title} for ${repoSlug}`}
          >
            {tab.title}
          </Button>
        ))}
      </div>
      <div>{children}</div>
    </>
  );
}
