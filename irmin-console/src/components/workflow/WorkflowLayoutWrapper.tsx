'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';
import {
  TbDatabase,
  TbFileText,
  TbLogs,
  TbRun,
  TbSettings,
} from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { ExportWorkflow, ImportWorkflow } from '@/types/api/Workflow';

/**
 * Component to wrap the single Workflow pages in.
 *
 * @param children - The children to render
 */
export default function WorkflowLayoutWrapper({
  children,
  workflowSlug,
}: {
  children: React.ReactNode;
  workflowSlug: string;
}) {
  const currentPath = usePathname();
  const { dict, locale } = useLocale();
  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
  } = useWorkspace();

  const workflow = useMemo(
    () => allWorkflows.find((item) => item.slug === workflowSlug),
    [workflowSlug, allWorkflows]
  );

  const repositorySlug = useMemo(() => {
    if (workflow?.workflowable_type === 'action') return undefined;
    if (workflow?.workflowable_type === 'import')
      return (workflow as ImportWorkflow).workflowable.repository.slug;
    if (workflow?.workflowable_type === 'export')
      return (workflow as ExportWorkflow).workflowable.repository.slug;
  }, [workflow]);

  const workspaceSlug = useMemo(
    () => currentWorkspace?.slug ?? '',
    [currentWorkspace]
  );

  const tabs = useMemo(
    () => [
      {
        title: dict.workflow.tabs.overview,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}`,
        icon: <TbRun size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.data,
        href: `/${locale}/portal/${workspaceSlug}/repositories/${repositorySlug ?? ''}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/repositories/${repositorySlug ?? ''}`,
        icon: <TbDatabase size={14} />,
        hide: !repositorySlug,
      },
      {
        title: dict.workflow.tabs.documentation,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/documentation`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/documentation`,
        icon: <TbFileText size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.logs,
        href: `/${locale}/portal/${workspaceSlug}/logs/workflow/${workflow?.slug}`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/logs/workflow/${workflow?.slug}`,
        icon: <TbLogs size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.settings,
        href: `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/settings`,
        active:
          currentPath ===
          `/${locale}/portal/${workspaceSlug}/workflows/${workflow?.slug}/settings`,
        icon: <TbSettings size={14} />,
        hide: false,
      },
    ],
    [currentPath, dict, locale, workflow, repositorySlug, workspaceSlug]
  );

  if (!workflow) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto w-full px-2 md:px-4'>
          <div className='flex flex-col gap-2 py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-xs text-gray-400 md:text-sm lg:text-base'>
                  {dict.workflow.workflow}
                </span>
                <span className='rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {workflow.workflowable_type === 'action' &&
                    dict.workflow.action}
                  {workflow.workflowable_type === 'import' &&
                    dict.workflow.import}
                  {workflow.workflowable_type === 'export' &&
                    dict.workflow.export}
                </span>
              </div>
              <span className='px-2 text-xs text-gray-400 md:text-sm lg:text-base'>
                {dict.list.owner}: {workflow.owner.name}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg font-normal text-irmin_black md:text-2xl dark:text-white'>
                {workflow.name}
              </h1>
              {workflow ? (
                <StatusBadge
                  runStatus={workflow.status}
                  statusLabel={workflow.status}
                />
              ) : (
                <></>
              )}
            </div>
            <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
              {workflow.description}
            </p>
          </div>
        </div>
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4 md:gap-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='black'
            className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
            href={`/${locale}/portal/${workspaceSlug}/workflows`}
          >
            <IoChevronBack size={24} />
          </Button>
          {tabs
            .map((tab, idx) => {
              if (tab.hide) return null;
              return (
                <Button
                  key={`workflow-tab-${idx}`}
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
