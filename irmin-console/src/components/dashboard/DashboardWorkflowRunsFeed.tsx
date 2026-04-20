'use client';

import Link from 'next/link';

import * as Tooltip from '@radix-ui/react-tooltip';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, intervalToDuration } from 'date-fns';

import { TbClock, TbHourglassLow, TbRun } from 'react-icons/tb';

import { workflowRunsQueryKey } from '@/lib/queryKeys';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { formatDurationForUI } from '@/utils/formatDurationForUI';
import { cn } from '@/utils/tw';

import type {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

interface DashboardWorkflowRunsResponse extends Omit<
  IrminAPIResponse<WorkflowRun[]>,
  'pagination'
> {
  pagination?: IrminAPIPaginationMetadata;
}

interface DashboardWorkflowRunsFeedProps {
  workspaceUrl: string;
  className?: string;
}

/**
 * Dashboard workflow runs feed component
 *
 * @param props - The component props
 * @param props.workspaceUrl - The workspace URL
 * @param props.className - The class name of the card
 */
export function DashboardWorkflowRunsFeed({
  workspaceUrl,
  className,
}: DashboardWorkflowRunsFeedProps) {
  const { dict, locale } = useLocale();
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const workflowRunsQuery = useQuery<DashboardWorkflowRunsResponse, Error>({
    queryKey: workflowRunsQueryKey(workspaceSlug, 'dashboard', 1),
    queryFn: async () => {
      const core = await getCore();
      return core.workflowRunService.fetchAllWorkflowRuns({
        workspace: workspaceSlug,
        perPage: 8, // Show more items than list cards
        page: 1,
      });
    },
  });

  const runs = workflowRunsQuery.data?.data || [];

  return (
    <Card className={cn('flex h-full flex-col bg-card', className)}>
      <CardHeader className='p-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <TbRun className='size-4 text-primary' />
            {dict.workflow.recentRuns}
          </CardTitle>
          {runs.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='text-xs'
              href={`${workspaceUrl}/workflows/runs`}
            >
              {dict.list.viewAll}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={`
          flex flex-1 flex-col overflow-y-auto px-2 pt-0 pb-2
          lg:px-4
        `}
      >
        {workflowRunsQuery.isLoading ? (
          <div className='space-y-1'>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={`skeleton-run-${index}`} className='p-1.5'>
                <div className='mb-0.5 flex items-center gap-1.5'>
                  <LoadingSkeleton className='h-3 w-1/3' />
                  <LoadingSkeleton className='h-4 w-16' />
                </div>
                <div className='flex items-center gap-2'>
                  <LoadingSkeleton className='h-3 w-20' />
                  <LoadingSkeleton className='h-3 w-16' />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {runs.length === 0 ? (
              <EmptyState
                icon={<TbRun className='size-full opacity-50' />}
                title={dict.list.emptyState.allWorkflowRuns.title}
                description={dict.list.emptyState.allWorkflowRuns.description}
                size='sm'
              />
            ) : (
              <>
                <div className='flex-1 space-y-1'>
                  <Tooltip.TooltipProvider>
                    {runs.map((run) => (
                      <Link
                        key={run.id}
                        className={`
                          flex cursor-pointer items-center justify-between
                          rounded-[2px] p-1.5 transition-colors
                          hover:bg-muted/50
                        `}
                        href={`${workspaceUrl}/workflows/${run.workflow_id}/run/${run.id}`}
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='mb-0.5 flex items-center gap-1.5'>
                            <h4 className='truncate text-xs font-medium'>
                              {run.workflow_name}
                            </h4>
                            <Badge className='px-1 py-0 text-xs'>
                              {run.workflow_type === 'action' &&
                                dict.workflow.action}
                              {run.workflow_type === 'import' &&
                                dict.workflow.import}
                              {run.workflow_type === 'export' &&
                                dict.workflow.export}
                              {run.workflow_type === 'pipeline' &&
                                dict.workflow.pipeline.pipeline}
                            </Badge>
                          </div>
                          <div
                            className={`
                              flex items-center gap-2 text-xs
                              text-muted-foreground
                            `}
                          >
                            <Tooltip.Root>
                              <Tooltip.Trigger>
                                <div className='flex items-center gap-1'>
                                  <TbClock className='size-2.5' />
                                  {formatDistanceToNow(
                                    new Date(run.started_at ?? ''),
                                    {
                                      addSuffix: true,
                                    }
                                  )}
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                side='top'
                                align='center'
                                className='rounded-sm bg-background p-2'
                              >
                                <p className='text-xs'>
                                  {dict.workflow.startedAt}
                                  {': '}
                                  {new Date(
                                    run.started_at ?? ''
                                  ).toLocaleString(locale)}
                                </p>
                                <Tooltip.Arrow />
                              </Tooltip.Content>
                            </Tooltip.Root>
                            {run.finished_at && (
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <div className='flex items-center gap-1'>
                                    <TbHourglassLow className='size-2.5' />
                                    {formatDurationForUI(
                                      intervalToDuration({
                                        start: new Date(run.started_at ?? ''),
                                        end: new Date(run.finished_at),
                                      })
                                    )}
                                  </div>
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                  side='top'
                                  align='center'
                                  className='rounded-sm bg-background p-2'
                                >
                                  <p className='text-xs'>
                                    {dict.workflow.duration}
                                    {': '}
                                    {formatDurationForUI(
                                      intervalToDuration({
                                        start: new Date(run.started_at ?? ''),
                                        end: new Date(run.finished_at),
                                      })
                                    )}
                                  </p>
                                  <Tooltip.Arrow />
                                </Tooltip.Content>
                              </Tooltip.Root>
                            )}
                          </div>
                        </div>
                        <div className='ml-1'>
                          {run.status === '' || !run.status ? (
                            <StatusBadge
                              status='default'
                              label={dict.workflow.noStatus}
                            />
                          ) : (
                            <StatusBadge
                              status={run.status}
                              label={run.status}
                            />
                          )}
                        </div>
                      </Link>
                    ))}
                  </Tooltip.TooltipProvider>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
