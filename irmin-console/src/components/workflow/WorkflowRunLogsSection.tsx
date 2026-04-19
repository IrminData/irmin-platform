'use client';

import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbFileText, TbHourglassLow } from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import WorkflowRunTriggerDetails from '@/components/workflow/WorkflowRunTriggerDetails';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflowRun } from '@/hooks/api';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

/**
 * Workflow Run Logs section - showing logs for a specific workflow run.
 *
 * @param props - The component properties
 * @param props.workflowID - The ID of the workflow
 * @param props.runID - The ID of the workflow run
 */
export default function WorkflowRunLogsSection({
  workflowID,
  runID,
}: {
  workflowID: string;
  runID: string;
}) {
  const { dict, locale } = useLocale();

  const { workflowRunQuery } = useWorkflowRun(workflowID, runID, {
    refetchInterval: (query) => {
      const runData = query.state.data;
      if (!runData?.data) return false;

      const run = runData.data;
      const hasInProgressStatus =
        run.status === 'pending' ||
        run.status === 'initiating' ||
        run.status === 'running';

      const hasLogs = run.logs && run.logs.length > 0;

      // Poll while the run is in progress
      if (hasInProgressStatus) {
        return 2000;
      }

      // Also poll for a short time after completion if we don't have logs yet
      // This handles the race condition where status changes before logs are available
      if (!hasLogs && run.finished_at) {
        const finishedTime = new Date(run.finished_at).getTime();
        const now = Date.now();
        const timeSinceFinished = now - finishedTime;

        // Keep polling for up to 10 seconds after completion if no logs
        if (timeSinceFinished < 10000) {
          return 2000;
        }
      }

      return false;
    },
  });

  // Show error state if there's an error and we don't have any cached data
  if (workflowRunQuery.error && !workflowRunQuery.data?.data) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <QueryError
          error={workflowRunQuery.error}
          onRetry={() => workflowRunQuery.refetch()}
          title={dict.common.errors.failedToLoadWorkflowRuns}
          description={dict.common.errors.failedToLoadAgain}
        />
      </div>
    );
  }

  // Show empty state only if we're not loading and have no data
  if (!workflowRunQuery.isLoading && !workflowRunQuery.data?.data) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <EmptyState
          title={dict.list.emptyState.generic.title}
          description={dict.list.emptyState.generic.description}
          icon={<TbFileText className='size-full' />}
          size='md'
        />
      </div>
    );
  }

  const workflowRun = workflowRunQuery.data?.data;
  const isLoading = workflowRunQuery.isLoading && !workflowRun;

  // If still loading and no data at all, show full page skeleton
  if (isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  // At this point we have workflowRun data (either from cache or fetched)
  if (!workflowRun) {
    return null;
  }

  const hasInProgressStatus =
    workflowRun.status === 'pending' ||
    workflowRun.status === 'initiating' ||
    workflowRun.status === 'running';

  const showLogsWaitingState =
    hasInProgressStatus && (!workflowRun.logs || workflowRun.logs.length === 0);

  return (
    <div
      className={`
        flex flex-col gap-8 px-2
        md:px-4
      `}
    >
      <div className='container mx-auto max-w-7xl'>
        <div
          className={`
            flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4
            rounded-lg bg-card p-4 text-sm text-card-foreground
            lg:text-lg
          `}
        >
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.run}</p>
            <p className='text-base'>{workflowRun.id}</p>
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.startedAt}</p>
            <p className='text-base'>
              {new Date(workflowRun.started_at ?? '').toLocaleString(locale)}
            </p>
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.finishedAt}</p>
            <p className='text-base'>
              {workflowRun.finished_at
                ? new Date(workflowRun.finished_at).toLocaleString(locale)
                : '-'}
            </p>
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.triggeredBy}</p>
            {workflowRun.triggered_by_user && (
              <p className='text-base'>{workflowRun.triggered_by_user.email}</p>
            )}
            {workflowRun.triggered_by && (
              <p className='text-base'>{workflowRun.triggered_by.type}</p>
            )}
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.list.status}</p>
            {workflowRun.status === '' || !workflowRun.status ? (
              <StatusBadge status='default' label={dict.workflow.noStatus} />
            ) : (
              <StatusBadge
                status={workflowRun.status}
                label={workflowRun.status ?? dict.workflow.noStatus}
              />
            )}
          </div>
          <div className='flex flex-col gap-1'>
            <p
              className={`
                flex items-center text-sm
                lg:text-base
              `}
            >
              <TbClock className='mr-1' />
              {formatDistanceToNow(new Date(workflowRun.started_at ?? ''), {
                addSuffix: true,
              })}
            </p>
            <p
              className={`
                flex items-center text-sm
                lg:text-base
              `}
            >
              <TbHourglassLow className='mr-1' />
              {workflowRun.finished_at
                ? formatDurationForUI(
                    intervalToDuration({
                      start: new Date(workflowRun.started_at ?? ''),
                      end: new Date(workflowRun.finished_at),
                    })
                  )
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Trigger Information */}
      <div className='container mx-auto max-w-7xl'>
        <WorkflowRunTriggerDetails
          triggeredBy={workflowRun.triggered_by}
          triggeredByUser={workflowRun.triggered_by_user}
        />
      </div>

      {/* Logs Section */}
      {showLogsWaitingState ? (
        <div className='container mx-auto max-w-7xl'>
          <EmptyState
            title={dict.logs.waitingForLogs}
            description={dict.logs.waitingForResults}
            icon={<TbHourglassLow className='size-full' />}
            size='md'
          />
        </div>
      ) : workflowRun.logs && workflowRun.logs.length > 0 ? (
        <div className='h-[calc(100vh-347px)]'>
          <LogFeed logs={workflowRun.logs} />
        </div>
      ) : (
        <div className='container mx-auto max-w-7xl'>
          <EmptyState
            title={dict.logs.noLogsFound}
            description={dict.list.emptyState.generic.description}
            icon={<TbFileText className='size-full' />}
            size='md'
          />
        </div>
      )}
    </div>
  );
}
