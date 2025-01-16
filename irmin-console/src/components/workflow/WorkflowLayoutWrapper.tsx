'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { RiFlowChart } from 'react-icons/ri';
import {
  TbClockCog,
  TbDatabase,
  TbFileText,
  TbLogs,
  TbPlayerPlay,
  TbRun,
  TbSettings,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkflow } from '@/context/WorkflowContext';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Component to wrap the single Workflow pages in.
 *
 * @param props - The properties of the component
 * @param props.children - The children to render
 * @param props.workflowID - The ID of the workflow to show
 *
 * @returns The Workflow layout wrapper
 */
export default function WorkflowLayoutWrapper({
  children,
  workflowID,
}: {
  children: React.ReactNode;
  workflowID: string;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { workflow, triggerWorkflowRun } = useWorkflow();

  // The base URL for the workflow, eg. /en/workspace/workspace-slug/workflows/workflow-id
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'workflows',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const repositorySlug = useMemo(
    () =>
      workflow?.type === 'import' || workflow?.type === 'export'
        ? workflow?.workflowable?.repository?.slug
        : null,
    [workflow]
  );
  const repositoryBranch = useMemo(
    () =>
      workflow?.type === 'import' || workflow?.type === 'export'
        ? workflow?.workflowable?.branch
        : null,
    [workflow]
  );

  const tabs = useMemo(
    () => [
      {
        name: dict.common.overview,
        link: `${baseUrl}`,
        active: pathname === `${baseUrl}`,
        icon: <TbRun size={14} />,
        hidden: false,
      },
      {
        name: dict.workflow.pipeline.pipeline,
        link: `${baseUrl}/pipeline`,
        active: pathname === `${baseUrl}/pipeline`,
        icon: <RiFlowChart size={14} />,
        hidden: workflow.type !== 'pipeline',
      },
      {
        name: dict.workflow.tabs.schedule,
        link: `${baseUrl}/schedule`,
        active: pathname === `${baseUrl}/schedule`,
        icon: <TbClockCog size={14} />,
        hidden: false,
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
        hidden: false,
      },
      {
        name: dict.workflow.tabs.data,
        link: `${workspaceUrl}/repositories/${repositorySlug}?ref=${repositoryBranch}`,
        active: false,
        icon: <TbDatabase size={14} />,
        hidden: !repositorySlug,
      },
      {
        name: dict.workflow.tabs.logs,
        link: `${workspaceUrl}/logs/workflow/${workflowID}`,
        active: false,
        icon: <TbLogs size={14} />,
        hidden: false,
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hidden: false,
      },
    ],
    [
      workflow,
      pathname,
      dict,
      workflowID,
      repositoryBranch,
      repositorySlug,
      baseUrl,
      workspaceUrl,
    ]
  );

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
          <div className='flex flex-1 flex-col gap-2 py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-xs text-gray-400 md:text-sm'>
                  {dict.workflow.workflow}
                </span>
                <Badge>
                  {workflow.type === 'action' && dict.workflow.action}
                  {workflow.type === 'import' && dict.workflow.import}
                  {workflow.type === 'export' && dict.workflow.export}
                  {workflow.type === 'pipeline' &&
                    dict.workflow.pipeline.pipeline}
                </Badge>
              </div>
              <span className='px-2 text-xs text-gray-400 md:text-sm'>
                {dict.list.owner}:{' '}
                {`${workflow.owner.first_name} ${workflow.owner.last_name}`}
                {workflow.owner.company
                  ? ` (${workflow.owner.company})`
                  : ''} - {workflow.owner.email}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg font-normal text-foreground md:text-2xl'>
                {workflow.name}
              </h1>
              {workflow ? (
                <StatusBadge status={workflow.status} label={workflow.status} />
              ) : (
                <></>
              )}
            </div>
            <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
              {workflow.description}
            </p>
          </div>
          <div className='flex min-w-60 flex-col gap-2'>
            <Button
              onClick={triggerWorkflowRun}
              className='w-full'
              variant='default'
              size='lg'
              icon={<TbPlayerPlay size={14} />}
              loadingText={dict.workflow.triggeringRun}
            >
              {dict.workflow.triggerRun}
            </Button>
          </div>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/workflows`}
          backTooltip={dict.workflow.workflows}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
