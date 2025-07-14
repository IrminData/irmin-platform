'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import {
  TbAdjustments,
  TbBook,
  TbClockCog,
  TbDatabase,
  TbFileText,
  TbJumpRope,
  TbPlayerPlay,
  TbRun,
  TbSettings,
  TbShield,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useWorkflow } from '@/hooks/useWorkflow';
import useWorkflowRuns from '@/hooks/useWorkflowRuns';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { TabDetails } from '@/types/internal/Tabs';

/**
 * Component to wrap the single Workflow pages in.
 *
 * @param props - The properties of the component
 * @param props.children - The children to render
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
  const router = useRouter();
  const pathname = usePathname();
  const { dict } = useLocale();
  const { createWorkflowRunMutation } = useWorkflowRuns(workflowID);
  const { workflowQuery } = useWorkflow(workflowID);
  const { isResourceAllowed } = useResourceAllowed();

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

  // Make sure the user is allowed to access the workflow
  useEffect(() => {
    if (
      !isResourceAllowed(PolicyResource.Workflow, PolicyAction.Read, workflowID)
    ) {
      // Redirect to the workspace workflows page if the user is not allowed to access the workflow
      router.push(`${workspaceUrl}/workflows`);
    }
  }, [isResourceAllowed, workflowID, workspaceUrl, router]);

  if (workflowQuery.isLoading)
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );

  if (workflowQuery.isError)
    return (
      <div>
        {dict.common.error}: {workflowQuery.error.message}
      </div>
    );

  const workflow = workflowQuery.data?.data;

  if (!workflow) return <></>;

  const repositorySlug =
    workflow?.type === 'import' || workflow?.type === 'export'
      ? workflow?.workflowable?.repository
      : null;

  const repositoryBranch =
    workflow?.type === 'import' || workflow?.type === 'export'
      ? workflow?.workflowable?.repository_branch
      : null;

  const configureWorkflowableLabel =
    workflow.type === 'import'
      ? dict.workflow.create.configureImport
      : workflow.type === 'export'
        ? dict.workflow.create.configureExport
        : workflow.type === 'pipeline'
          ? dict.workflow.create.configurePipeline
          : workflow.type === 'action'
            ? dict.workflow.create.configureAction
            : '';

  const tabs: TabDetails[] = [
    {
      name: dict.common.overview,
      link: `${baseUrl}`,
      active: pathname === `${baseUrl}`,
      icon: <TbRun size={14} />,
    },
    {
      name: configureWorkflowableLabel,
      link: `${baseUrl}/workflowable`,
      active: pathname === `${baseUrl}/workflowable`,
      icon: <TbAdjustments size={14} />,
      hidden: !isResourceAllowed(
        PolicyResource.Workflow,
        PolicyAction.Update,
        workflowID
      ),
    },
    {
      name: dict.schemaFieldMapper.title,
      link: `${baseUrl}/field-mapper`,
      active: pathname === `${baseUrl}/field-mapper`,
      icon: <TbJumpRope size={14} />,
      hidden:
        (workflow.type !== 'import' && workflow.type !== 'export') ||
        !isResourceAllowed(
          PolicyResource.Workflow,
          PolicyAction.Update,
          workflowID
        ),
    },
    {
      name: dict.workflow.tabs.schedule,
      link: `${baseUrl}/schedule`,
      active: pathname === `${baseUrl}/schedule`,
      icon: <TbClockCog size={14} />,
    },
    {
      name: dict.documentation.documentation,
      link: `${baseUrl}/documentation`,
      active: pathname === `${baseUrl}/documentation`,
      icon: <TbFileText size={14} />,
    },
    {
      name: dict.workspace.policies,
      link: `${baseUrl}/policies`,
      active: pathname === `${baseUrl}/policies`,
      icon: <TbShield size={14} />,
      hidden: !isResourceAllowed(PolicyResource.Policy, PolicyAction.Read),
    },
    {
      name: dict.workflow.tabs.data,
      link: `${workspaceUrl}/repositories/${repositorySlug}?ref=${repositoryBranch}`,
      active: false,
      icon: <TbDatabase size={14} />,
      hidden:
        !repositorySlug ||
        !isResourceAllowed(PolicyResource.Repository, PolicyAction.Read),
    },
    {
      name: dict.common.logs,
      link: `${workspaceUrl}/logs/workflow/${workflow?.id}`,
      active: false,
      icon: <TbBook size={14} />,
      hidden: !isResourceAllowed(PolicyResource.AuditLog, PolicyAction.Read),
    },
    {
      name: dict.consoleNavigation.settings,
      link: `${baseUrl}/settings`,
      active: pathname === `${baseUrl}/settings`,
      icon: <TbSettings size={14} />,
    },
  ];

  return (
    <>
      <div className='relative container mx-auto max-w-7xl'>
        <div
          className={`
            mx-auto my-4 flex w-full flex-col px-2
            md:px-4
            lg:flex-row lg:items-center
          `}
        >
          <div className='flex flex-1 flex-col gap-2 py-4'>
            <div
              className={`
                flex flex-row items-center divide-x divide-gray-300
                dark:divide-gray-700
              `}
            >
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span
                  className={`
                    text-xs text-gray-400
                    md:text-sm
                  `}
                >
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
              <span
                className={`
                  px-2 text-xs text-gray-400
                  md:text-sm
                `}
              >
                {dict.list.owner}:{' '}
                {`${workflow.owner.first_name} ${workflow.owner.last_name}`}
                {workflow.owner.company
                  ? ` (${workflow.owner.company})`
                  : ''} - {workflow.owner.email}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1
                className={`
                  text-lg font-normal text-foreground
                  md:text-2xl
                `}
              >
                {workflow.name}
              </h1>
              {workflow ? (
                <StatusBadge
                  status={workflow.status}
                  label={workflow.status ?? dict.workflow.noStatus}
                />
              ) : (
                <></>
              )}
              {workflow.tags && workflow.tags.length > 0 && (
                <WorkspaceTagDisplay
                  tags={workflow.tags}
                  maxVisible={3}
                  size='sm'
                />
              )}
            </div>
            <p
              className={`
                max-w-lg text-xs text-gray-400
                lg:text-sm
              `}
            >
              {workflow.description}
            </p>
          </div>
          <div className='flex min-w-60 flex-col gap-2'>
            <Button
              onClick={() => createWorkflowRunMutation.mutate()}
              className='w-full'
              variant='default'
              size='lg'
              icon={<TbPlayerPlay size={14} />}
              loading={createWorkflowRunMutation.isPending}
              disabled={
                !isResourceAllowed(
                  PolicyResource.WorkflowRun,
                  PolicyAction.Create,
                  workflowID
                )
              }
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
