'use client';

import { memo, useMemo } from 'react';

import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { ImportWorkflow } from '@/types/core/Workflow';
import type {
  EmptyStateAction,
  GridRow,
  TableRowAction,
} from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Import Workflows
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge}
 */
const ImportWorkflowList = ({
  loading,
  importWorkflows: items,
  emptyStateAction,
}: {
  loading: boolean;
  importWorkflows: ImportWorkflow[];
  emptyStateAction?: EmptyStateAction;
}) => {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const rows: GridRow[] = useMemo(
    () =>
      items
        .map((item) => {
          if (!isResourceAllowed('workflow', 'read', item.id)) {
            return null;
          }

          const actions: (TableRowAction & { hidden?: boolean })[] = [
            {
              label: dict.common.view,
              primary: true,
              href: `${workspaceUrl}/workflows/${item.id}`,
            },
            {
              label: dict.common.edit,
              primary: false,
              href: `${workspaceUrl}/workflows/${item.id}/settings`,
              hidden: !isResourceAllowed('workflow', 'update', item.id),
            },
            {
              label: dict.common.logs,
              primary: false,
              href: `${workspaceUrl}/logs/workflow/${item.id}`,
              hidden: !isResourceAllowed('audit_log', 'read'),
            },
          ];

          return {
            columns: [
              <div
                key={`name-and-owner-${item.id}`}
                className='inline-flex flex-col gap-1'
              >
                <p className='text-base'>{item.name}</p>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {dict.common.owner}: {item.owner.email}
                  {item.owner.company ? ` (${item.owner.company})` : ''}
                </span>
              </div>,
              <div
                key={`status-${item.id}`}
                className='inline-flex flex-row items-center gap-2'
              >
                {item.status === '' || !item.status ? (
                  <StatusBadge
                    status='default'
                    label={dict.workflow.noStatus}
                  />
                ) : (
                  <StatusBadge status={item.status} label={item.status} />
                )}
                <div className='flex flex-col'>
                  {item.schedule?.triggers &&
                  item.schedule.triggers.length > 0 ? (
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
            actions: actions.filter((action) => !action.hidden),
            details: (
              <div
                className={`
                  flex max-w-sm flex-col text-gray-600
                  dark:text-gray-400
                `}
              >
                <p className='pb-4 text-sm'>{item.description}</p>
              </div>
            ),
          };
        })
        .filter((row) => row !== null),
    [items, workspaceUrl, dict, isResourceAllowed]
  );

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.common.name, dict.list.status, dict.common.actions]}
      rows={rows}
      hideHeaders={false}
      emptyStateTitle={dict.list.emptyState.workflows.title}
      emptyStateDescription={dict.list.emptyState.workflows.description}
      emptyStateAction={emptyStateAction}
    />
  );
};

export default memo(ImportWorkflowList);
