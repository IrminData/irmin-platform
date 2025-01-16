'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Workflow } from '@/types/core/Workflow';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Workflows of all types
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge}
 */
const WorkflowList = ({
  loading,
  workflows: items,
}: {
  loading: boolean;
  workflows: Workflow[];
}) => {
  const { dict, locale } = useLocale();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const rows: GridRow[] = useMemo(
    () =>
      items.map((item, i) => {
        const tableActions = [
          {
            label: dict.list.view,
            primary: true,
            href: `${workspaceUrl}/workflows/${item.id}`,
          },
          {
            label: dict.list.edit,
            primary: false,
            href: `${workspaceUrl}/workflows/${item.id}/settings`,
          },
          {
            label: dict.list.logs,
            primary: false,
            href: `${workspaceUrl}/logs/workflow/${item.id}`,
          },
        ];
        return {
          columns: [
            <div
              key={`name-and-owner-${i}`}
              className='inline-flex flex-col gap-1'
            >
              <div className='text-base'>
                {item.name}
                <Badge className='ml-2'>
                  {item.type === 'action' && dict.workflow.action}
                  {item.type === 'import' && dict.workflow.import}
                  {item.type === 'export' && dict.workflow.export}
                  {item.type === 'pipeline' && dict.workflow.pipeline.pipeline}
                </Badge>
              </div>
              <span className='text-sm text-gray-400'>
                {dict.list.owner}: {item.owner.email}
                {item.owner.company ? ` (${item.owner.company})` : ''}
              </span>
            </div>,
            <div
              key={`status-${i}`}
              className='inline-flex flex-row items-center gap-2'
            >
              <StatusBadge status={item.status} label={item.status} />
              <div className='flex flex-col'>
                {item.schedule && item.schedule.triggers.length > 0 ? (
                  <span className='text-xs text-gray-400'>
                    {dict.workflow.scheduled}
                  </span>
                ) : (
                  <span className='text-xs text-gray-400'>
                    {dict.workflow.notScheduled}
                  </span>
                )}
              </div>
            </div>,
          ],
          actions: tableActions,
          details: (
            <div className='flex max-w-sm flex-col text-gray-400'>
              <p className='pb-4 text-sm'>{item.description}</p>
              <p className='pb-1 text-xs'>
                {dict.list.lastUpdated}
                {': '}
                {new Date(item.updated_at).toLocaleString(locale)}
              </p>
              <p className='text-xs'>
                {dict.list.createdAt}
                {': '}
                {new Date(item.created_at).toLocaleString(locale)}
              </p>
            </div>
          ),
        };
      }),
    [items, locale, dict, workspaceUrl]
  );

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.common.name, dict.list.status, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default WorkflowList;
