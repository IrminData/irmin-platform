'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import * as Tooltip from '@radix-ui/react-tooltip';
import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow } from 'react-icons/tb';

import NormalList from '@/components/ui/list/NormalList';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useConnections } from '@/hooks/useConnections';
import { useWorkflow } from '@/hooks/useWorkflow';
import useWorkflowRuns from '@/hooks/useWorkflowRuns';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

import { Repository } from '@/types/core/Repository';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Workflow section component to show basic information about a workflow
 * and a list of runs for the workflow
 */
const WorkflowSection = ({
  workflowID,
  repositories,
}: {
  workflowID: string;
  repositories: Repository[];
}) => {
  const { dict, locale } = useLocale();
  const { workflowQuery } = useWorkflow(workflowID);

  const { currentPage, totalPages, goToPage, workflowRunsQuery } =
    useWorkflowRuns(workflowID);
  const { connectionsQuery } = useConnections();

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
      workflowRunsQuery.data?.data?.map((run, i) => ({
        columns: [
          <Tooltip.Root key={`run-${i}`}>
            <Tooltip.Trigger>
              <div className='inline-flex cursor-pointer flex-col gap-2'>
                <p className='flex items-center text-xs lg:text-sm'>
                  <TbClock className='mr-1' />
                  {formatDistanceToNow(new Date(run.started_at ?? ''), {
                    addSuffix: true,
                  })}
                </p>
                <p className='flex items-center text-xs lg:text-sm'>
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
              className='tooltip-content bg-background rounded p-2'
            >
              <p className='text-xs lg:text-sm'>
                {dict.workflow.startedAt}
                {': '}
                {new Date(run.started_at ?? '').toLocaleString(locale)}
              </p>
              <p className='text-xs lg:text-sm'>
                {dict.workflow.finishedAt}
                {': '}
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString(locale)
                  : '-'}
              </p>
              <p className='text-xs lg:text-sm'>
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
                <p className='text-xs lg:text-sm'>
                  {run.triggered_by_user.email}
                </p>
              )}
              {run.triggered_by && (
                <p className='text-xs lg:text-sm'>{run.triggered_by.type}</p>
              )}
              {/* TODO: Add more information on what triggered the workflow to run */}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>,
          <div key={`run-${i}-owner`} className='inline-flex flex-col gap-2'>
            {run.triggered_by_user && (
              <p className='text-xs lg:text-sm'>
                {run.triggered_by_user.email}
              </p>
            )}
            {run.triggered_by && (
              <p className='text-xs lg:text-sm'>{run.triggered_by.type}</p>
            )}
          </div>,
          <div key={`run-${i}-status`} className='inline-flex flex-col gap-2'>
            <StatusBadge
              status={run.status}
              label={run.status ?? dict.workflow.noStatus}
            />
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

  if (workflowQuery.isError)
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <div className='my-4 flex flex-col gap-4 p-4'>
          <p className='text-sm opacity-60'>{dict.common.error}</p>
          <p className='text-sm opacity-60'>{workflowQuery.error.message}</p>
        </div>
      </div>
    );

  const workflow = workflowQuery.data?.data;

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        {workflowQuery.isLoading && (
          <div className='flex h-full w-full items-center justify-center gap-4'>
            <LoadingSkeleton className='h-10 w-10' />
            <LoadingSkeleton className='h-10 w-10' />
            <LoadingSkeleton className='h-10 w-10' />
            <LoadingSkeleton className='h-10 w-10' />
          </div>
        )}
        {workflow && (
          <div className='bg-card text-foreground flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg p-4 text-sm lg:text-lg'>
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.schedule.workflowSchedule}
              </p>
              <p className='text-base'>
                {workflow.schedule &&
                workflow.schedule.triggers &&
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
                  className='transition-all hover:underline hover:opacity-40'
                >
                  <p className='text-base'>
                    {workflow.workflowable.executable}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'action' && workflow.workflowable.repository && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.scriptResultDestinationRepository}
                </p>
                <Link
                  className='transition-all duration-200 hover:underline'
                  target='_blank'
                  href={`${workspaceUrl}/repositories/${workflow.workflowable.repository}?ref=${workflow.workflowable.branch}`}
                >
                  <p className='text-base'>
                    {repositories.find(
                      (repo) => repo.slug === workflow.workflowable.repository
                    )?.name ?? '-'}
                  </p>
                </Link>
              </div>
            )}
            {workflow.type === 'action' && workflow.workflowable.repository && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.scriptResultDestinationBranch}
                </p>
                <p className='text-base'>
                  {workflow.workflowable.branch ?? '-'}
                </p>
              </div>
            )}
            {workflow.type === 'action' && workflow.workflowable.repository && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.scriptResultDestinationPath}
                </p>
                <p className='text-base'>{workflow.workflowable.path ?? '/'}</p>
              </div>
            )}
            {workflow.type === 'action' &&
              workflow.workflowable.input &&
              workflow.workflowable.input.length > 0 && (
                <div className='flex flex-col gap-1'>
                  <p className='text-sm opacity-60'>
                    {dict.workflow.scriptInputData}
                  </p>
                  {workflow.workflowable.input?.map((input, id) => (
                    <Link
                      key={id}
                      className='transition-all duration-200 hover:underline'
                      target='_blank'
                      href={`${workspaceUrl}/repositories/${input.repository}/object?path=${input.path}&ref=${input.ref}`}
                    >
                      <p className='text-base'>
                        {`${input.repository}/${input.path}@${input.ref}`}
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
                  className='transition-all duration-200 hover:underline'
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
                  {workflow.workflowable.connection_path ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importDestinationRepository}
                </p>
                <Link
                  className='transition-all duration-200 hover:underline'
                  href={`${workspaceUrl}/repositories/${workflow.workflowable.repository}?ref=${workflow.workflowable.branch}`}
                >
                  <p className='text-base'>
                    {repositories.find(
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
                <p className='text-base'>{workflow.workflowable.branch}</p>
              </div>
            )}
            {workflow.type === 'import' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.importDestinationPath}
                </p>
                <p className='text-base'>{workflow.workflowable.path ?? '/'}</p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportDestinationConnection}
                </p>
                <Link
                  className='transition-all duration-200 hover:underline'
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
                  {workflow.workflowable.connection_path ?? '/'}
                </p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportSourceRepository}
                </p>
                <Link
                  className='transition-all duration-200 hover:underline'
                  href={`${workspaceUrl}/repositories/${workflow.workflowable.repository}?ref=${workflow.workflowable.branch}`}
                >
                  <p className='text-base'>
                    {repositories.find(
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
                <p className='text-base'>{workflow.workflowable.branch}</p>
              </div>
            )}
            {workflow.type === 'export' && (
              <div className='flex flex-col gap-1'>
                <p className='text-sm opacity-60'>
                  {dict.workflow.exportSourcePath}
                </p>
                <p className='text-base'>{workflow.workflowable.path ?? '/'}</p>
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
    </div>
  );
};

export default WorkflowSection;
