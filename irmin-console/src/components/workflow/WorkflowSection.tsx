'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import IrminCore from '@/services/core/IrminCore';

import NormalList from '@/components/ui/list/NormalList';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/core/Workflow';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Workflow section component to show basic information about a workflow
 * and a list of runs for the workflow
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to show
 */
const WorkflowSection = ({ workflow }: { workflow: Workflow }) => {
  const { dict, locale } = useLocale();

  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loadingWorkflowRuns, setLoadingWorkflowRuns] = useState(true);

  const { workflowService } = useMemo(() => new IrminCore(locale), [locale]);

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await workflowService.fetchRunsByWorkflow(workflow.id);
        setWorkflowRuns(res.data);
      } catch (error) {
        console.error('Error fetching workflow runs:', error);
      } finally {
        setLoadingWorkflowRuns(false);
      }
    })();
  }, [workflowService, workflow]);

  const runRows: GridRow[] = useMemo(
    () =>
      workflowRuns.map((run, i) => ({
        columns: [
          <div key={`run-${i}`} className='inline-flex flex-col gap-2'>
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
          </div>,
          <div key={`run-${i}-owner`} className='inline-flex flex-col gap-2'>
            <p className='text-xs lg:text-sm'>{run.owner.name}</p>
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
    [dict, locale, workflowRuns, workspaceUrl, workflow.id]
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
              <p className='text-base'>
                {(workflow as ActionWorkflow).workflowable.executable}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationRepository}
              </p>
              <p className='text-base'>
                {(workflow as ActionWorkflow).workflowable.repository?.name ??
                  '-'}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationBranch}
              </p>
              <p className='text-base'>
                {(workflow as ActionWorkflow).workflowable.branch ?? '-'}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.scriptResultDestinationPath}
              </p>
              <p className='text-base'>
                {(workflow as ActionWorkflow).workflowable.path ?? '/'}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importSourceConnection}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/connections/${(workflow as ImportWorkflow).workflowable.connection.id}`}
              >
                <p className='text-base'>
                  {(workflow as ImportWorkflow).workflowable.connection.name}
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
                href={`${workspaceUrl}/repositories/${(workflow as ImportWorkflow).workflowable.repository.slug}`}
              >
                <p className='text-base'>
                  {(workflow as ImportWorkflow).workflowable.repository.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importDestinationBranch}
              </p>
              <p className='text-base'>
                {(workflow as ImportWorkflow).workflowable.branch}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'import' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.importDestinationPath}
              </p>
              <p className='text-base'>
                {(workflow as ImportWorkflow).workflowable.path}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportDestinationConnection}
              </p>
              <Link
                className='transition-all duration-200 hover:underline'
                href={`${workspaceUrl}/connections/${(workflow as ExportWorkflow).workflowable.connection.id}`}
              >
                <p className='text-base'>
                  {(workflow as ExportWorkflow).workflowable.connection.name}
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
                href={`${workspaceUrl}/repositories/${(workflow as ExportWorkflow).workflowable.repository.slug}`}
              >
                <p className='text-base'>
                  {(workflow as ExportWorkflow).workflowable.repository.name}
                </p>
              </Link>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportSourceBranch}
              </p>
              <p className='text-base'>
                {(workflow as ExportWorkflow).workflowable.branch}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportSourcePath}
              </p>
              <p className='text-base'>
                {(workflow as ExportWorkflow).workflowable.path}
              </p>
            </div>
          )}
          {workflow.workflowable_type === 'export' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.exportRecursive}
              </p>
              <p className='text-base'>
                {(workflow as ExportWorkflow).workflowable.recursive
                  ? dict.misc.yes
                  : dict.misc.no}
              </p>
            </div>
          )}
        </div>
        <NormalList
          headers={[
            dict.workflow.run,
            dict.list.owner,
            dict.list.status,
            dict.list.actions,
          ]}
          loading={loadingWorkflowRuns}
          hideHeaders={false}
          rows={runRows}
        />
      </div>
    </div>
  );
};

export default WorkflowSection;
