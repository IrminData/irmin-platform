'use client';

import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow } from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

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
  const { workflowRunQuery } = useWorkflowRun(workflowID, runID);

  if (workflowRunQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workflowRunQuery.error) {
    return <div>Error: {workflowRunQuery.error.message}</div>;
  }

  if (!workflowRunQuery.data?.data) {
    return <div>No data</div>;
  }

  const workflowRun = workflowRunQuery.data.data;

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
            {/* TODO: Add more information on what triggered the workflow to run - consider showing trigger details like schedule cron expression, webhook payload, or manual trigger reason */}
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
      {workflowRun.logs ? (
        <div className='h-[calc(100vh-347px)]'>
          <LogFeed logs={workflowRun.logs ?? []} />
        </div>
      ) : (
        <p
          className={`
            text-center text-lg text-gray-600
            dark:text-gray-400
          `}
        >
          {dict.logs.noLogsFound}
        </p>
      )}
    </div>
  );
}
