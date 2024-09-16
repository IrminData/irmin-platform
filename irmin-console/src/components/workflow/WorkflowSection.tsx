'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import IrminCore from '@/services/core/IrminCore';

import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
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

  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loadingWorkflowRuns, setLoadingWorkflowRuns] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { workflowService } = new IrminCore(locale);
        const result = await workflowService.fetchRunsByWorkflow(workflow.id);
        setWorkflowRuns(result.data);
      } catch (error) {
        console.error('Error fetching workflow runs:', error);
      } finally {
        setLoadingWorkflowRuns(false);
      }
    })();
  }, [locale, workflow]);

  const runRows: GridRow[] = useMemo(() => {
    return (
      workflowRuns.map((run, i) => {
        return {
          columns: [
            <div
              key={`run-${i}-start-time`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-xs lg:text-sm'>
                {new Date(run.started_at).toLocaleString(locale)}
              </p>
            </div>,
            <div
              key={`run-${i}-finished-time`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-xs lg:text-sm'>
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString(locale)
                  : '-'}
              </p>
            </div>,
            <div key={`run-${i}-owner`} className='inline-flex flex-col gap-2'>
              <p className='text-xs lg:text-sm'>{run.owner.name}</p>
            </div>,
            <div key={`run-${i}-status`} className='inline-flex flex-col gap-2'>
              <StatusBadge runStatus={run.status} statusLabel={run.status} />
            </div>,
          ],
        };
      }) ?? []
    );
  }, [workflowRuns, locale]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-gray-100 p-4 text-sm text-irmin_black lg:text-lg dark:bg-irmin_black-800 dark:text-gray-100'>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.workflow.runInterval}</p>
            <p className='text-base'>
              {workflow.cron_syntax && workflow.cron_syntax.length > 0
                ? workflow.cron_syntax
                : dict.workflow.notScheduled}
            </p>
          </div>
          <div className='flex flex-col gap-1'>
            <p className='text-sm opacity-60'>{dict.list.nextRun}</p>
            <p className='text-base'>
              {workflow.next_run_at
                ? new Date(workflow.next_run_at).toLocaleString(locale)
                : '-'}
            </p>
          </div>
          {workflow.workflowable_type === 'action' && (
            <div className='flex flex-col gap-1'>
              <p className='text-sm opacity-60'>
                {dict.workflow.executableScriptFile}
              </p>
              <p className='text-base'>
                {(workflow as ActionWorkflow).workflowable.path}
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
                href={`/${locale}/portal/${currentWorkspace?.slug}/connections/${(workflow as ImportWorkflow).workflowable.connection.slug}`}
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
                href={`/${locale}/portal/${currentWorkspace?.slug}/repositories/${(workflow as ImportWorkflow).workflowable.repository.slug}`}
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
                href={`/${locale}/portal/${currentWorkspace?.slug}/connections/${(workflow as ExportWorkflow).workflowable.connection.slug}`}
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
                href={`/${locale}/portal/${currentWorkspace?.slug}/repositories/${(workflow as ExportWorkflow).workflowable.repository.slug}`}
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
            dict.workflow.startedAt,
            dict.workflow.finishedAt,
            dict.list.owner,
            dict.list.status,
          ]}
          loading={loadingWorkflowRuns}
          hideHeaders={false}
          noActions={true}
          rows={runRows}
        />
      </div>
    </div>
  );
};

export default WorkflowSection;
