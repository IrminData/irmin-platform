'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';
import {
  TbDatabase,
  TbFileText,
  TbLogs,
  TbRun,
  TbSchema,
  TbSettings,
} from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import StatusBadge from '@/components/common/status/StatusBadge';
import BranchSelector from '@/components/repository/partials/BranchSelector';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';
import { Workflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Component to wrap the single Workflows pages in.
 * Provides tabs, title and other info for the workflow.
 *
 * @param children - The children to render
 */
export default function WorkflowLayoutWrapperContent({
  children,
  workflow,
  repository,
  currentWorkspace,
}: {
  children: React.ReactNode;
  workflow: Workflow | undefined;
  repository: Repository | undefined;
  currentWorkspace: Workspace | null;
}) {
  const currentPath = usePathname();
  const { locale, dict } = useLocale();
  const { currentBranch, setCurrentBranch, branchesResults } = useData();

  const workspaceSlug = useMemo(
    () => currentWorkspace?.slug ?? '',
    [currentWorkspace]
  );

  const tabs = useMemo(
    () => [
      {
        title: dict.workflow.tabs.runs,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}`,
        icon: <TbRun size={14} />,
        hide: false,
      },
      {
        title: dict.repository.tabs.structure,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/structure`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/structure`,
        icon: <TbSchema size={14} />,
      },
      {
        title: dict.workflow.tabs.data,
        href: `/${locale}/portal/${workspaceSlug}/repositories/${repository?.slug}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/repositories/${repository?.slug}`,
        icon: <TbDatabase size={14} />,
      },
      {
        title: dict.workflow.tabs.documentation,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/documentation`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        title: dict.workflow.tabs.logs,
        href: `/portal/${workspaceSlug}/logs/workflow/${workflow?.slug}`,
        active:
          currentPath ===
          `/portal/${workspaceSlug}/logs/workflow/${workflow?.slug}`,
        icon: <TbLogs size={14} />,
      },
      {
        title: dict.repository.tabs.settings,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/settings`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/settings`,
        icon: <TbSettings size={14} />,
      },
    ],
    [currentPath, dict, locale, workflow, repository, workspaceSlug]
  );

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto w-full px-2 md:px-4'>
          <div className='flex flex-col py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-sm text-gray-400'>
                  {dict.workflow.workflow}
                </span>
                <span className='rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {workflow?.workflowable_type}
                </span>
              </div>
              <span className='px-2 text-sm text-gray-400'>
                {dict.list.owner}: {repository?.owner.name}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg font-normal text-irmin_black md:text-2xl dark:text-white'>
                {workflow?.name ?? '-'}
              </h1>
              {workflow ? (
                <StatusBadge
                  runStatus={workflow.status}
                  statusLabel={workflow.status}
                />
              ) : (
                <></>
              )}
              <div className='ml-auto'>
                <BranchSelector
                  branches={
                    branchesResults?.data.branches.map((branch) => ({
                      label: branch.name,
                      value: branch.name,
                    })) ?? []
                  }
                  currentBranch={
                    currentBranch ??
                    branchesResults?.data.branches.filter(
                      (branch) => branch.default
                    )[0].name ??
                    'main'
                  }
                  onChangeBranch={(branch) => {
                    setCurrentBranch(branch.value);
                  }}
                />
              </div>
            </div>
            <div className='text-xs text-gray-400'>
              {repository?.description}
            </div>
          </div>
        </div>
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4 md:gap-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='black'
            className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
            href={`/${locale}/portal/${workspaceSlug}/workflows`}
            ariaLabel='Back to Workflows'
          >
            <IoChevronBack size={24} />
          </Button>
          {tabs
            .map((tab, idx) => {
              if (tab.hide) return null;
              return (
                <Button
                  key={`data-repo-tab-${idx}`}
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
