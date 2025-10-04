'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import * as Tooltip from '@radix-ui/react-tooltip';
import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow } from 'react-icons/tb';

import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import NormalList from '@/components/ui/list/NormalList';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import {
  useConnections,
  useRepositories,
  useWorkflow,
  useWorkflowRuns,
} from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

import type { GridRow } from '@/types/internal/ListProps';

/**
 * Workflow section component to show basic information about a workflow
 * and a list of runs for the workflow
 */
const WorkflowSection = ({ workflowID }: { workflowID: string }) => {
  const { dict, locale } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { workflowQuery } = useWorkflow(workflowID);
  const { repositoriesQuery } = useRepositories();
  const { currentPage, totalPages, goToPage, workflowRunsQuery } =
    useWorkflowRuns(workflowID);
  const { connectionsQuery } = useConnections();

  const canViewWorkflow = useMemo(
    () => isResourceAllowed('workflow', 'read', workflowID),
    [isResourceAllowed, workflowID]
  );

  const canViewRuns = useMemo(
    () => isResourceAllowed('workflow_run', 'read', workflowID),
    [isResourceAllowed, workflowID]
  );

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

  const runRows: GridRow[] = useMemo(
    () =>
      workflowRunsQuery.data?.data?.map((run) => ({
        columns: [
          <Tooltip.Root key={`run-${run.id}`}>
            <Tooltip.Trigger>
              <div className='inline-flex cursor-pointer flex-col gap-2'>
                <p
                  className={`
                    flex items-center text-xs
                    lg:text-sm
                  `}
                >
                  <TbClock className='mr-1' />
                  {formatDistanceToNow(new Date(run.started_at ?? ''), {
                    addSuffix: true,
                  })}
                </p>
                <p
                  className={`
                    flex items-center text-xs
                    lg:text-sm
                  `}
                >
                  <TbHourglassLow className='mr-1' />
                  {run.finished_at
                    ? formatDurationForUI(
                        intervalToDuration({
                          start: new Date(run.started_at ?? ''),
                          end: new Date(run.finished_at),
                        })
                      )
                    : '-'}
                </p>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content
              side='top'
              align='center'
              className='rounded bg-background p-2'
            >
              <p
                className={`
                  text-xs
                  lg:text-sm
                `}
              >
                {dict.workflow.startedAt}
                {': '}
                {new Date(run.started_at ?? '').toLocaleString(locale)}
              </p>
              <p
                className={`
                  text-xs
                  lg:text-sm
                `}
              >
                {dict.workflow.finishedAt}
                {': '}
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString(locale)
                  : '-'}
              </p>
              <p
                className={`
                  text-xs
                  lg:text-sm
                `}
              >
                {dict.workflow.duration}
                {': '}
                {run.finished_at
                  ? formatDurationForUI(
                      intervalToDuration({
                        start: new Date(run.started_at ?? ''),
                        end: new Date(run.finished_at),
                      })
                    )
                  : '-'}
              </p>
              <p className='text-xs opacity-60'>{dict.workflow.triggeredBy}</p>
              {run.triggered_by_user && (
                <p
                  className={`
                    text-xs
                    lg:text-sm
                  `}
                >
                  {run.triggered_by_user.email}
                </p>
              )}
              {run.triggered_by && (
                <p
                  className={`
                    text-xs
                    lg:text-sm
                  `}
                >
                  {run.triggered_by.type}
                </p>
              )}
              {run.triggered_by?.type === 'time' && run.triggered_by.cron && (
                <p className='text-xs text-muted-foreground'>
                  Cron: {run.triggered_by.cron}
                </p>
              )}
              {run.triggered_by?.type === 'time' && run.triggered_by.rrule && (
                <p className='text-xs text-muted-foreground'>
                  RRule: {run.triggered_by.rrule}
                </p>
              )}
              {run.triggered_by?.type === 'repository-event' && (
                <p className='text-xs text-muted-foreground'>
                  Event: {run.triggered_by.event}
                  {run.triggered_by.repository &&
                    ` on ${run.triggered_by.repository}`}
                  {run.triggered_by.ref && ` (${run.triggered_by.ref})`}
                </p>
              )}
              {run.triggered_by?.type === 'workflow-run-event' && (
                <p className='text-xs text-muted-foreground'>
                  Event: {run.triggered_by.event}
                  {run.triggered_by.workflow &&
                    ` from ${run.triggered_by.workflow}`}
                </p>
              )}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>,
          <div
            key={`run-${run.id}-owner`}
            className='inline-flex flex-col gap-2'
          >
            {run.triggered_by_user && (
              <p
                className={`
                  text-xs
                  lg:text-sm
                `}
              >
                {run.triggered_by_user.email}
              </p>
            )}
            {run.triggered_by && (
              <div className='space-y-1'>
                <p
                  className={`
                    text-xs
                    lg:text-sm
                  `}
                >
                  {run.triggered_by.type}
                </p>
                {run.triggered_by.type === 'time' && run.triggered_by.cron && (
                  <p className='text-xs text-muted-foreground'>
                    {run.triggered_by.cron}
                  </p>
                )}
                {run.triggered_by.type === 'time' && run.triggered_by.rrule && (
                  <p className='text-xs text-muted-foreground'>RRule</p>
                )}
                {run.triggered_by.type === 'repository-event' && (
                  <p className='text-xs text-muted-foreground'>
                    {run.triggered_by.event}
                    {run.triggered_by.repository &&
                      ` (${run.triggered_by.repository})`}
                  </p>
                )}
                {run.triggered_by.type === 'workflow-run-event' && (
                  <p className='text-xs text-muted-foreground'>
                    {run.triggered_by.event}
                  </p>
                )}
              </div>
            )}
          </div>,
          <div
            key={`run-${run.id}-status`}
            className='inline-flex flex-col gap-2'
          >
            {run.status === '' || !run.status ? (
              <StatusBadge status='default' label={dict.workflow.noStatus} />
            ) : (
              <StatusBadge status={run.status} label={run.status} />
            )}
          </div>,
        ],
        actions: [
          {
            label: dict.common.logs,
            primary: false,
            href: `${baseUrl}/run/${run.id}`,
          },
        ],
      })) ?? [],
    [dict, locale, baseUrl, workflowRunsQuery.data?.data]
  );

  if (!canViewWorkflow) {
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <CommonErrorDisplay
          variant='section'
          title={dict.common.error}
          description={dict.common.insufficientPermissions}
          showReload={false}
          showDetails={false}
        />
      </div>
    );
  }

  if (workflowQuery.isError) {
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <QueryError
          error={workflowQuery.error}
          onRetry={() => workflowQuery.refetch()}
          title={dict.common.error}
        />
      </div>
    );
  }

  const workflow = workflowQuery.data?.data;

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        {workflowQuery.isLoading && (
          <div className='flex size-full items-center justify-center gap-4'>
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
          </div>
        )}
        {workflow && (
          <div
            className={`
              flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4
              rounded-lg bg-card p-4 text-sm text-foreground
              lg:text-lg
            `}
          >
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.schedule.workflowSchedule}
              </p>
              <p className='text-base'>
                {workflow.schedule?.triggers &&
                workflow.schedule.triggers.length > 0
                  ? dict.workflow.scheduled
                  : dict.workflow.notScheduled}
              </p>
            </div>
            {workflow.type === 'action' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.executableScriptFile}
                </p>
                <Link
                  href={`${workspaceUrl}/editor?path=${workflow.workflowable.executable}`}
                  target='_blank'
                  className={`
                    transition-all
                    hover:underline hover:opacity-40
                  `}
                >
                  <p className='text-base'>
                    {workflow.workflowable.executable}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'action' &&
              workflow.workflowable.results_repository && (
                <div className='flex flex-col gap-1'>
                  <p className='text-sm opacity-60'>
                    {dict.workflow.scriptResultDestinationRepository}
                  </p>
                  <Link
                    className={`
                      transition-all duration-200
                      hover:underline
                    `}
                    target='_blank'
                    href={`${workspaceUrl}/repositories/${workflow.workflowable.results_repository}?ref=${workflow.workflowable.results_repository_branch}`}
                  >
                    <p className='text-base'>
                      {repositoriesQuery.data?.data?.find(
                        (repo) =>
                          repo.slug === workflow.workflowable.results_repository
                      )?.name ?? '-'}
                    </p>
                  </Link>
                </div>
              )}
            {workflow.type === 'action' &&
              workflow.workflowable.results_repository && (
                <div className='flex flex-col gap-1'>
                  <p className='text-sm opacity-60'>
                    {dict.workflow.scriptResultDestinationBranch}
                  </p>
                  <p className='text-base'>
                    {workflow.workflowable.results_repository_branch ?? '-'}
                  </p>
                </div>
              )}
            {workflow.type === 'action' &&
              workflow.workflowable.results_repository && (
                <div className='flex flex-col gap-1'>
                  <p className='text-sm opacity-60'>
                    {dict.workflow.scriptResultDestinationPath}
                  </p>
                  <p className='text-base'>
                    {workflow.workflowable.results_repository_path ?? '/'}
                  </p>
                </div>
              )}
            {workflow.type === 'action' &&
              workflow.workflowable.input &&
              workflow.workflowable.input.length > 0 && (
                <div className='flex flex-col gap-1'>
                  <p className='text-sm opacity-60'>
                    {dict.workflow.scriptInputData}
                  </p>
                  {workflow.workflowable.input?.map((input) => (
                    <Link
                      key={`${input.repository}/${input.repository_path}@${input.repository_ref}`}
                      className={`
                        transition-all duration-200
                        hover:underline
                      `}
                      target='_blank'
                      href={`${workspaceUrl}/repositories/${input.repository}/object?path=${input.repository_path}&ref=${input.repository_ref}`}
                    >
                      <p className='text-base'>
                        {`${input.repository}/${input.repository_path}@${input.repository_ref}`}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importSourceConnection}
                </p>
                <Link
                  className={`
                    transition-all duration-200
                    hover:underline
                  `}
                  href={`${workspaceUrl}/connections/${workflow.workflowable.connection_id}`}
                >
                  <p className='text-base'>
                    {connectionsQuery.data?.data?.find(
                      (conn) => conn.id === workflow.workflowable.connection_id
                    )?.name ?? '-'}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importSourceConnectionPath}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.import_from_connection_paths?.join(
                    ', '
                  ) ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importDestinationRepository}
                </p>
                <Link
                  className={`
                    transition-all duration-200
                    hover:underline
                  `}
                  href={`${workspaceUrl}/repositories/${workflow.workflowable.repository}?ref=${workflow.workflowable.repository_branch}`}
                >
                  <p className='text-base'>
                    {repositoriesQuery.data?.data?.find(
                      (repo) => repo.slug === workflow.workflowable.repository
                    )?.name ?? '-'}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importDestinationBranch}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.repository_branch}
                </p>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importDestinationPath}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.import_to_repository_path ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportDestinationConnection}
                </p>
                <Link
                  className={`
                    transition-all duration-200
                    hover:underline
                  `}
                  href={`${workspaceUrl}/connections/${workflow.workflowable.connection_id}`}
                >
                  <p className='text-base'>
                    {connectionsQuery.data?.data?.find(
                      (conn) => conn.id === workflow.workflowable.connection_id
                    )?.name ?? '-'}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportDestinationConnectionPath}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.export_to_connection_path ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportSourceRepository}
                </p>
                <Link
                  className={`
                    transition-all duration-200
                    hover:underline
                  `}
                  href={`${workspaceUrl}/repositories/${workflow.workflowable.repository}?ref=${workflow.workflowable.repository_branch}`}
                >
                  <p className='text-base'>
                    {repositoriesQuery.data?.data?.find(
                      (repo) => repo.slug === workflow.workflowable.repository
                    )?.name ?? '-'}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportSourceBranch}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.repository_branch}
                </p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportSourcePath}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.export_from_repository_paths?.join(
                    ', '
                  ) ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'pipeline' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.livePipeline}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.live
                    ? dict.common.yes
                    : dict.common.no}
                </p>
              </div>
            )}
          </div>
        )}
        {canViewRuns && (
          <>
            <Tooltip.TooltipProvider>
              <NormalList
                headers={[
                  dict.workflow.run,
                  dict.workflow.triggeredBy,
                  dict.list.status,
                  dict.list.actions,
                ]}
                loading={workflowRunsQuery.isLoading}
                hideHeaders={false}
                rows={runRows}
                emptyStateTitle={
                  dict.list.emptyState.workflowRunsForWorkflow.title
                }
                emptyStateDescription={
                  dict.list.emptyState.workflowRunsForWorkflow.description
                }
              />
            </Tooltip.TooltipProvider>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              previousLabel={dict.common.previous}
              nextLabel={dict.common.next}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowSection;
