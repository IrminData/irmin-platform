'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import * as Tooltip from '@radix-ui/react-tooltip';
import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow } from 'react-icons/tb';

import NormalList from '@/components/ui/list/NormalList';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkflow } from '@/context/WorkflowContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { formatDurationForUI } from '@/utils/formatDurationForUI';

import { GridRow } from '@/types/internal/ListProps';

/**
 * Workflow section component to show basic information about a workflow
 * and a list of runs for the workflow
 */
const WorkflowSection = () => {
  const { dict, locale } = useLocale();

  const { workflow, runs } = useWorkflow();

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });
  const runRows: GridRow[] = useMemo(
    () =>
      runs.map((run, i) => ({
        columns: [
          <Tooltip.Root key={`run-${i}`}>
            <Tooltip.Trigger>
              <div className='inline-flex cursor-pointer flex-col gap-2'>
                <p className='flex items-center text-xs lg:text-sm'>
                  <TbClock className='mr-1' />
                  {formatDistanceToNow(new Date(run.started_at), {
                    addSuffix: true,
                  })}
                </p>
                <p className='flex items-center text-xs lg:text-sm'>
                  <TbHourglassLow className='mr-1' />
                  {run.finished_at
                    ? formatDurationForUI(
                        intervalToDuration({
                          start: new Date(run.started_at),
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
              className='tooltip-content rounded bg-background p-2'
            >
              <p className='text-xs lg:text-sm'>
                {dict.workflow.startedAt}
                {': '}
                {new Date(run.started_at).toLocaleString(locale)}
              </p>
              <p className='text-xs lg:text-sm'>
                {dict.workflow.finishedAt}
                {': '}
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString(locale)
                  : '-'}
              </p>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>,
          <div key={`run-${i}-owner`} className='inline-flex flex-col gap-2'>
            <p className='text-xs lg:text-sm'>{run.owner.email}</p>
          </div>,
          <div key={`run-${i}-status`} className='inline-flex flex-col gap-2'>
            <StatusBadge status={run.status} label={run.status} />
          </div>,
        ],
        actions: [
          {
            label: dict.list.logs,
            primary: false,
            href: `${workspaceUrl}/logs/workflow/${workflow.id}/run/${run.id}`,
          },
        ],
      })),
    [dict, locale, runs, workspaceUrl, workflow.id]
  );

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-card p-4 text-sm text-foreground lg:text-lg'>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>
              {dict.workflow.schedule.workflowSchedule}
            </p>
            <p className='text-base'>
              {workflow.schedule && workflow.schedule.triggers.length > 0
                ? dict.workflow.scheduled
                : dict.workflow.notScheduled}
            </p>
          </div>
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.executableScriptFile}
              </p>
              <p className='text-base'>{workflow.workflowable.executable}</p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationRepository}
              </p>
              <p className='text-base'>
                {workflow.workflowable.repository?.name ?? '-'}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationBranch}
              </p>
              <p className='text-base'>{workflow.workflowable.branch ?? '-'}</p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationPath}
              </p>
              <p className='text-base'>{workflow.workflowable.path ?? '/'}</p>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importSourceConnection}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/connections/${workflow.workflowable.connection.id}`}
              >
                <p className='text-base'>
                  {workflow.workflowable.connection.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importDestinationRepository}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/repositories/${workflow.workflowable.repository.slug}`}
              >
                <p className='text-base'>
                  {workflow.workflowable.repository.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importDestinationBranch}
              </p>
              <p className='text-base'>{workflow.workflowable.branch}</p>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importDestinationPath}
              </p>
              <p className='text-base'>{workflow.workflowable.path}</p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportDestinationConnection}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/connections/${workflow.workflowable.connection.id}`}
              >
                <p className='text-base'>
                  {workflow.workflowable.connection.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportSourceRepository}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/repositories/${workflow.workflowable.repository.slug}`}
              >
                <p className='text-base'>
                  {workflow.workflowable.repository.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportSourceBranch}
              </p>
              <p className='text-base'>{workflow.workflowable.branch}</p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportSourcePath}
              </p>
              <p className='text-base'>{workflow.workflowable.path}</p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportRecursive}
              </p>
              <p className='text-base'>
                {workflow.workflowable.recursive ? dict.misc.yes : dict.misc.no}
              </p>
            </div>
          )}
        </div>
        <Tooltip.TooltipProvider>
          <NormalList
            headers={[
              dict.workflow.run,
              dict.list.owner,
              dict.list.status,
              dict.list.actions,
            ]}
            hideHeaders={false}
            rows={runRows}
          />
        </Tooltip.TooltipProvider>
      </div>
    </div>
  );
};

export default WorkflowSection;
