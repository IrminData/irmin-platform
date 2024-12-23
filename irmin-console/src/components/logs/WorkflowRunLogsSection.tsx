'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { IoChevronBack } from 'react-icons/io5';
import { TbClock, TbHourglassLow } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

import { WorkflowRunLogs } from '@/types/core/Log';
import { Workflow, WorkflowRun } from '@/types/core/Workflow';

import LogFeed from './LogFeed';

/**
 * Workflow Run Logs section - showing logs for a specific workflow run.
 *
 * @param props - The component properties
 * @param props.workflowRun - The workflow run to display logs for
 * @param props.workflowRunLogs - The logs for the workflow run
 * @param props.workflow - The workflow the run belongs to
 */
export default function WorkflowRunLogsSection({
  workflowRun,
  workflowRunLogs,
  workflow,
}: {
  workflowRun: WorkflowRun;
  workflowRunLogs: WorkflowRunLogs;
  workflow?: Workflow;
}) {
  const router = useRouter();
  const { dict, locale } = useLocale();

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <div className='flex flex-col px-2 pt-12 md:px-4'>
      <div className='container mx-auto mb-12 max-w-6xl'>
        <div className='mb-12 flex items-center gap-8'>
          <ButtonWithTooltip
            size='icon'
            variant='gray'
            className='rounded-full'
            icon={<IoChevronBack size={24} />}
            onClick={() => router.back()}
            tooltip={dict.common.back}
            aria-label={dict.common.back}
          />
          <div>
            <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
              {dict.logs.workflowRunLogs}
            </h2>
            {workflow && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/workflows/${workflowRun.workflow_id}`}
                >
                  {workflow.name}
                </Link>
                , {dict.workflow.run}
                {': '}
                {workflowRun.id}
              </h3>
            )}
          </div>
        </div>
        <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-card p-4 text-sm text-card-foreground lg:text-lg'>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.startedAt}</p>
            <p className='text-base'>
              {new Date(workflowRun.started_at).toLocaleString(locale)}
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
            <p className='text-sm opacity-60'>{dict.list.owner}</p>
            <p className='text-base'>{workflowRun.owner.email}</p>
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.list.status}</p>
            <StatusBadge
              status={workflowRun.status}
              label={workflowRun.status}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <p className='flex items-center text-sm lg:text-base'>
              <TbClock className='mr-1' />
              {formatDistanceToNow(new Date(workflowRun.started_at), {
                addSuffix: true,
              })}
            </p>
            <p className='flex items-center text-sm lg:text-base'>
              <TbHourglassLow className='mr-1' />
              {workflowRun.finished_at
                ? formatDurationForUI(
                    intervalToDuration({
                      start: new Date(workflowRun.started_at),
                      end: new Date(workflowRun.finished_at),
                    })
                  )
                : '-'}
            </p>
          </div>
        </div>
      </div>
      {workflowRunLogs && workflowRunLogs.logs ? (
        <div className='h-[calc(100vh-347px)]'>
          <LogFeed logs={workflowRunLogs.logs} />
        </div>
      ) : (
        <p className='text-center text-lg text-gray-600 dark:text-gray-400'>
          {dict.logs.noLogsFound}
        </p>
      )}
    </div>
  );
}
