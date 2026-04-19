'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import * as Tooltip from '@radix-ui/react-tooltip';
import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import DisplayTitle from '@/components/ui/display-title';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import StatusBadge from '@/components/ui/StatusBadge';
import WorkflowRunTriggerDetails from '@/components/workflow/WorkflowRunTriggerDetails';

import { useLocale } from '@/context/LocaleContext';

import { useAllWorkflowRuns } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

import type { WorkflowRun } from '@/types/core/WorkflowRun';
import type { GridRow } from '@/types/internal/ListProps';

/**
 * All workflow runs section component to show a list of all workflow runs in the workspace
 */
const AllWorkflowRunsSection = () => {
  const { dict, locale } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { currentPage, totalPages, goToPage, allWorkflowRunsQuery } =
    useAllWorkflowRuns();

  const canViewRuns = useMemo(
    () => isResourceAllowed('workflow_run', 'read'),
    [isResourceAllowed]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const runRows: GridRow[] = useMemo(
    () =>
      allWorkflowRunsQuery.data?.data?.map((run: WorkflowRun) => ({
        columns: [
          <div
            key={`name-and-workflow-${run.id}`}
            className='inline-flex flex-col gap-1'
          >
            <div className='text-base'>
              <Link
                href={`${workspaceUrl}/workflows/${run.workflow_id}`}
                className={`
                  transition-opacity duration-200
                  hover:underline hover:opacity-40
                `}
              >
                {run.workflow_name}
              </Link>
              <Badge className='ml-2'>
                {run.workflow_type === 'action' && dict.workflow.action}
                {run.workflow_type === 'import' && dict.workflow.import}
                {run.workflow_type === 'export' && dict.workflow.export}
                {run.workflow_type === 'pipeline' &&
                  dict.workflow.pipeline.pipeline}
              </Badge>
            </div>
            <span className='text-sm text-gray-400'>
              {dict.workflow.run}: {run.id}
            </span>
          </div>,
          <Tooltip.Root key={`run-details-${run.id}`}>
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
              className='rounded-sm bg-background p-2'
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
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>,
          <div
            key={`triggered-by-${run.id}`}
            className='inline-flex flex-col gap-1'
          >
            {run.triggered_by_user && (
              <span className='text-sm text-gray-400'>
                {dict.common.owner}: {run.triggered_by_user.email}
                {run.triggered_by_user.company
                  ? ` (${run.triggered_by_user.company})`
                  : ''}
              </span>
            )}
            {run.triggered_by && (
              <div className='space-y-1'>
                <span className='text-sm text-gray-400'>
                  {dict.workflow.triggeredBy}: {run.triggered_by.type}
                </span>
                {run.triggered_by.type === 'time' && run.triggered_by.cron && (
                  <span className='block text-xs text-gray-500'>
                    {run.triggered_by.cron}
                  </span>
                )}
                {run.triggered_by.type === 'time' && run.triggered_by.rrule && (
                  <span className='block text-xs text-gray-500'>RRule</span>
                )}
                {run.triggered_by.type === 'repository-event' && (
                  <span className='block text-xs text-gray-500'>
                    {run.triggered_by.event}
                    {run.triggered_by.repository &&
                      ` (${run.triggered_by.repository})`}
                  </span>
                )}
                {run.triggered_by.type === 'workflow-run-event' && (
                  <span className='block text-xs text-gray-500'>
                    {run.triggered_by.event}
                  </span>
                )}
              </div>
            )}
          </div>,
          <div
            key={`status-${run.id}`}
            className='inline-flex flex-row items-center gap-2'
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
            primary: true,
            href: `${workspaceUrl}/workflows/${run.workflow_id}/run/${run.id}`,
          },
        ],
        details: (
          <div className='flex max-w-lg flex-col space-y-4'>
            <div className='text-gray-400'>
              <p className='pb-2 text-sm'>
                <strong>{dict.workflow.run}:</strong> {run.id}
              </p>
              <p className='pb-2 text-sm'>
                <strong>{dict.workflow.startedAt}:</strong>{' '}
                {new Date(run.started_at ?? '').toLocaleString(locale)}
              </p>
              {run.finished_at && (
                <p className='pb-2 text-sm'>
                  <strong>{dict.workflow.finishedAt}:</strong>{' '}
                  {new Date(run.finished_at).toLocaleString(locale)}
                </p>
              )}
              {run.finished_at && (
                <p className='pb-2 text-sm'>
                  <strong>{dict.workflow.duration}:</strong>{' '}
                  {formatDurationForUI(
                    intervalToDuration({
                      start: new Date(run.started_at ?? ''),
                      end: new Date(run.finished_at),
                    })
                  )}
                </p>
              )}
            </div>
            <div className='border-t border-border pt-4'>
              <WorkflowRunTriggerDetails
                triggeredBy={run.triggered_by}
                triggeredByUser={run.triggered_by_user}
              />
            </div>
          </div>
        ),
      })) ?? [],
    [dict, locale, workspaceUrl, allWorkflowRunsQuery.data?.data]
  );

  if (!canViewRuns) {
    return (
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div className='my-4 flex flex-row items-center justify-between gap-4'>
          <DisplayTitle>{dict.workflow.allWorkflowRuns}</DisplayTitle>
        </div>
        <LocalizedErrorDisplay
          variant='section'
          title={dict.common.insufficientPermissions}
          description={dict.common.errors.noPermissionsToViewWorkflowRuns}
          showReload={false}
          showDetails={false}
        />
      </div>
    );
  }

  if (allWorkflowRunsQuery.isError) {
    return (
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div className='my-4 flex flex-row items-center justify-between gap-4'>
          <DisplayTitle>{dict.workflow.allWorkflowRuns}</DisplayTitle>
        </div>
        <LocalizedErrorDisplay
          variant='section'
          error={allWorkflowRunsQuery.error}
          title={dict.common.errors.failedToLoadWorkflowRuns}
          description={dict.common.errors.failedToLoadAgain}
          onRetry={() => allWorkflowRunsQuery.refetch()}
          showReload={true}
          showDetails={true}
        />
      </div>
    );
  }

  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <DisplayTitle>{dict.workflow.allWorkflowRuns}</DisplayTitle>
      </div>
      <div className='py-4'>
        {allWorkflowRunsQuery.isLoading && (
          <div className='flex size-full items-center justify-center gap-4'>
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
            <LoadingSkeleton className='size-10' />
          </div>
        )}
        {canViewRuns && (
          <div className='flex flex-col gap-4'>
            <Tooltip.TooltipProvider>
              <CardOrNormalList
                headers={[
                  dict.common.name,
                  dict.workflow.run,
                  dict.workflow.triggeredBy,
                  dict.list.status,
                  dict.common.actions,
                ]}
                loading={allWorkflowRunsQuery.isLoading}
                hideHeaders={false}
                rows={runRows}
                emptyStateTitle={dict.list.emptyState.allWorkflowRuns.title}
                emptyStateDescription={
                  dict.list.emptyState.allWorkflowRuns.description
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AllWorkflowRunsSection;
