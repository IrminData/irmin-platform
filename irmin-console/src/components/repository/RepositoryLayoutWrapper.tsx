'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import { IoChevronBack } from 'react-icons/io5';
import { TbDatabase, TbFileText, TbSettings } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import BranchSelector from './BranchSelector';

/**
 * Component to wrap the Repository pages in.
 * Provides tabs and title for the repository.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 * @param props.repoSlug - The repository slug
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
  const pathname = usePathname();
  const {
    repositories: { repositories },
    workspaces: { currentWorkspace },
  } = useWorkspace();

  const { currentBranch, setCurrentBranch, branches, defaultBranch } =
    useData();

  const workspaceSlug = useMemo(
    () => currentWorkspace?.slug,
    [currentWorkspace]
  );
  const repository = useMemo(
    () => repositories.find((repo) => repo.slug === repoSlug),
    [repositories, repoSlug]
  );

  const tabs = useMemo(
    () => [
      {
        title: dict.repository.tabs.dataViewer,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}`,
        active:
          currentPath ===
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}`,
        icon: <TbDatabase size={14} />,
      },
      {
        title: dict.repository.tabs.commits,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/commits`,
        active:
          currentPath ===
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/commits`,
        icon: <GoGitCommit size={14} />,
      },
      {
        title: dict.repository.tabs.branches,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/branches`,
        active:
          currentPath ===
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/branches`,
        icon: <GoGitBranch size={14} />,
      },
      {
        title: dict.repository.tabs.compare,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/compare`,
        active:
          currentPath ===
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/compare`,
        icon: <GoGitCompare size={14} />,
      },
      {
        title: dict.repository.tabs.documentation,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/documentation`,
        active:
          currentPath ===
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        title: dict.repository.tabs.settings,
        href: `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/settings`,
        active: currentPath.includes(
          `/${locale}/console/${workspaceSlug}/repositories/${repoSlug}/settings`
        ),
        icon: <TbSettings size={14} />,
        hide: repository?.is_immutable,
      },
    ],
    [
      currentPath,
      dict,
      locale,
      repoSlug,
      repository?.is_immutable,
      workspaceSlug,
    ]
  );

  if (!repository || !currentWorkspace) {
    return (
      <div className='container relative mx-auto max-w-6xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
          <div className='flex flex-1 flex-col gap-2 py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-sm text-gray-400'>
                  {dict.repository.repository}
                </span>
                {repository.is_immutable && (
                  <span className='rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                    {dict.list.immutable}
                  </span>
                )}
              </div>
              <span className='px-2 text-sm text-gray-400'>
                {dict.list.owner}: {repository.owner.name}
                {repository.owner.company
                  ? ` (${repository.owner.company})`
                  : ''}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg font-normal text-irmin_black md:text-2xl dark:text-white'>
                {repository.name}
              </h1>
              <StatusBadge accessStatus={'private'} statusLabel={'Private'} />
            </div>
            <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
              {repository.description}
            </p>
          </div>
          <div className='flex min-w-60 flex-col gap-2'>
            {!pathname.includes('/compare') &&
              !pathname.includes('/settings') &&
              !pathname.includes('/ref') &&
              !pathname.includes('/branches') && (
                <BranchSelector
                  branches={branches ?? []}
                  currentBranch={currentBranch ?? defaultBranch}
                  onChangeBranch={(branch) => {
                    setCurrentBranch(branch.value);
                  }}
                />
              )}
          </div>
        </div>
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='light'
            className='bg-gray-100 dark:bg-gray-700'
            icon={<IoChevronBack size={24} />}
            href={`/${locale}/console/${workspaceSlug}/repositories`}
          />
          {tabs
            .map((tab, idx) => {
              if (tab.hide) return null;
              return (
                <Button
                  key={`repository-tab-${idx}`}
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
