'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';

import { IoChevronBack } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useLogs } from '@/context/LogContext';
import { useWorkspace } from '@/context/workspace';

import { WorkflowRun } from '@/types/core/Workflow';

import LogFeed from './LogFeed';

/**
 * Workflow Run Logs section - showing logs for a specific workflow run.
 *
 * @param props - The component properties
 * @param props.workflow - Slug of the workflow to fetch logs for
 * @param props.workflowRunId - ID of the workflow run to fetch logs for
 */
export default function WorkflowRunLogsSection({
  workflow,
  workflowRunId,
}: {
  workflow?: string;
  workflowRunId?: string;
}) {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const { workflowRunLogs, fetchWorkflowRunLogs, loadingWorkflowRunLogs } =
    useLogs();
  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
  } = useWorkspace();

  const [run, setRun] = useState<WorkflowRun | null>(null);

  const { workflowService } = useMemo(() => new IrminCore(locale), [locale]);

  useEffect(() => {
    fetchWorkflowRunLogs(workflow, workflowRunId);
    if (!workflow || !workflowRunId) return;
    workflowService
      .fetchWorkflowRunByID(workflow, workflowRunId)
      .then((res) => {
        setRun(res.data);
      });
  }, [workflow, workflowRunId, fetchWorkflowRunLogs, workflowService]);

  const selectedWorkflow = useMemo(
    () => allWorkflows.find((w) => w.slug === workflow),
    [allWorkflows, workflow]
  );

  const workspaceSlug = useMemo(
    () => currentWorkspace?.slug ?? '',
    [currentWorkspace]
  );

  return (
    <div className='flex flex-col px-2 pt-12 md:px-4'>
      <div className='container mx-auto mb-12 max-w-6xl'>
        <div className='mb-12 flex items-center gap-8'>
          <Button
            size='sm'
            variant='icon'
            colorScheme='black'
            className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
            onClick={() => router.back()}
          >
            <IoChevronBack size={24} />
          </Button>
          <div>
            <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
              {dict.logs.workflowRunLogs}
            </h2>
            {selectedWorkflow && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`/${locale}/console/${workspaceSlug}/workflows/${workflow}`}
                >
                  {selectedWorkflow.name}
                </Link>
                , {dict.workflow.run}
                {': '}
                {workflowRunId}
              </h3>
            )}
          </div>
        </div>
        {run && (
          <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-gray-100 p-4 text-sm text-irmin_black lg:text-lg dark:bg-irmin_black-800 dark:text-gray-100'>
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>{dict.workflow.startedAt}</p>
              <p className='text-base'>
                {new Date(run.started_at).toLocaleString(locale)}
              </p>
            </div>
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>{dict.workflow.finishedAt}</p>
              <p className='text-base'>
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString(locale)
                  : '-'}
              </p>
            </div>
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>{dict.workflow.owner}</p>
              <p className='text-base'>{run.owner.name}</p>
            </div>
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>{dict.list.status}</p>
              <p className='text-base'>
                <StatusBadge runStatus={run.status} statusLabel={run.status} />
              </p>
            </div>
          </div>
        )}
      </div>
      {loadingWorkflowRunLogs ? (
        <LoadingSkeleton className='h-96 w-full' />
      ) : workflowRunLogs && workflowRunLogs.logs ? (
        <div className='h-[calc(100vh-347px)]'>
          <LogFeed text={workflowRunLogs.logs} />
        </div>
      ) : (
        <p className='text-center text-lg text-gray-600 dark:text-gray-400'>
          {dict.logs.noLogsFound}
        </p>
      )}
    </div>
  );
}
