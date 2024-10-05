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

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Component to wrap the single Workflow pages in.
 *
 * @param props - The properties of the component
 * @param props.children - The children to render
 * @param props.workflowId - The ID of the workflow to show
 *
 * @returns The Workflow layout wrapper
 */
export default function WorkflowLayoutWrapper({
  children,
  workflowId,
}: {
  children: React.ReactNode;
  workflowId: string;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();

  // The base URL for the workflow, eg. /en/console/workspace-slug/workflows/workflow-id
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'workflows',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const {
    workflows: { allWorkflows },
  } = useWorkspace();

  const workflow = useMemo(
    () => allWorkflows.find((item) => item.id === workflowId),
    [allWorkflows, workflowId]
  );

  const repositorySlug = useMemo(
    () => workflow?.workflowable?.repository?.slug ?? null,
    [workflow]
  );

  const tabs = useMemo(
    () => [
      {
        title: dict.workflow.tabs.overview,
        href: `${baseUrl}`,
        active: pathname === `${baseUrl}`,
        icon: <TbRun size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.data,
        href: `${workspaceUrl}/repositories/${repositorySlug ?? ''}`,
        active: false,
        icon: <TbDatabase size={14} />,
        hide: !repositorySlug,
      },
      {
        title: dict.workflow.tabs.documentation,
        href: `${baseUrl}/documentation`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.logs,
        href: `${workspaceUrl}/logs/workflow/${workflowId}`,
        active: false,
        icon: <TbLogs size={14} />,
        hide: false,
      },
      {
        title: dict.workflow.tabs.settings,
        href: `${baseUrl}/settings`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hide: false,
      },
    ],
    [pathname, dict, workflowId, repositorySlug, baseUrl, workspaceUrl]
  );

  if (!workflow)
    return (
      <div className='container relative mx-auto max-w-6xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
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
                {workflow.owner.company ? ` (${workflow.owner.company})` : ''}
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
        <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='light'
            className='bg-gray-100 dark:bg-gray-700'
            icon={<IoChevronBack size={24} />}
            href={`${workspaceUrl}/workflows`}
          >
            <IoChevronBack size={24} />
          </Button>
          {tabs
            .map((tab, idx) => {
              if (tab.hide) return null;
              return (
                <Button
                  key={`workflow-tab-${idx}`}
                  className={`rounded-none border-irmin_green px-2 hover:no-underline lg:px-1 ${tab.active ? 'border-b-2' : 'border-0'}`}
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
