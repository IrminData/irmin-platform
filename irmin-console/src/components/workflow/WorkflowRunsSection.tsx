'use client';

import { useEffect, useMemo } from 'react';

import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Workflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Workflow Runs section component to show a list of runs for a workflow
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to editor the documentation for
 */
const WorkflowRunsSection = ({ workflow }: { workflow: Workflow }) => {
  const { dict, locale } = useLocale();
  const {
    workspaces: { currentWorkspace },
    workflows: { workflowRuns, fetchWorkflowRunsByWorkflow },
  } = useWorkspace();

  useEffect(() => {
    fetchWorkflowRunsByWorkflow(workflow.id);
  }, [workflow, fetchWorkflowRunsByWorkflow]);

  const rows: GridRow[] = useMemo(() => {
    if (!workflowRuns) return [];
    const filteredRuns = workflowRuns
      .filter((run) => run.workflow_id === workflow.id)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
    return (
      filteredRuns.map((run, i) => {
        return {
          columns: [
            <div key={`run-${i}-time`} className='inline-flex flex-col gap-2'>
              <p className='text-xs'>
                {dict.workflow.startedAt}
                {': '}
                {new Date(run.started_at).toLocaleString(locale)}
              </p>
              {run.finished_at && (
                <p className='text-xs'>
                  {dict.workflow.finishedAt}
                  {': '}
                  {new Date(run.finished_at).toLocaleString(locale)}
                </p>
              )}
            </div>,
            <div key={`run-${i}-owner`} className='inline-flex flex-col gap-2'>
              <p className='text-xs'>
                {dict.list.owner}: {run.owner.name}
              </p>
            </div>,
            <div key={`run-${i}-status`} className='inline-flex flex-col gap-2'>
              <StatusBadge runStatus={run.status} statusLabel={run.status} />
            </div>,
          ],
          actions: [
            {
              label: dict.list.logs,
              primary: false,
              href: `/portal/${currentWorkspace?.slug}/logs/workflow/${workflow.slug}`,
            },
          ],
        };
      }) ?? []
    );
  }, [workflowRuns, currentWorkspace, workflow, locale, dict]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='my-8 px-4'>
        <div className='mb-8 flex flex-row items-center justify-between px-2'>
          <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
            {dict.workflow.workflow} {dict.workflow.tabs.runs}
          </h2>
          <div className='flex flex-col gap-1 text-sm text-gray-400 lg:text-base'>
            <p>
              {dict.list.syncInterval}:{' '}
              {workflow.cron_syntax
                ? workflow.cron_syntax
                : dict.list.notScheduled}
            </p>
            <p>
              {dict.list.prevSync}
              {': '}
              {workflow.last_run_at
                ? new Date(workflow.last_run_at).toLocaleString(locale)
                : '-'}
            </p>
            <p>
              {dict.list.nextSync}
              {': '}
              {workflow.next_run_at
                ? new Date(workflow.next_run_at).toLocaleString(locale)
                : '-'}
            </p>
          </div>
        </div>
      </div>
      <NormalList
        headers={[
          dict.workflow.runTime,
          dict.list.owner,
          dict.list.status,
          dict.list.actions,
        ]}
        hideHeaders={false}
        rows={rows}
      />
    </div>
  );
};

export default WorkflowRunsSection;
