'use client';

import { memo, useMemo } from 'react';

import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import StatusBadge from '@/components/ui/StatusBadge';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { ActionWorkflow } from '@/types/core/Workflow';
import type {
  EmptyStateAction,
  GridRow,
  TableRowAction,
} from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Action Workflows
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge}
 */
const ActionWorkflowList = ({
  loading,
  actionWorkflows: items,
  emptyStateAction,
}: {
  loading: boolean;
  actionWorkflows: ActionWorkflow[];
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
          if (
            !isResourceAllowed(
              PolicyResource.Workflow,
              PolicyAction.Read,
              item.id
            )
          ) {
            return null;
          }

          const tableActions: (TableRowAction & { hidden?: boolean })[] = [
            {
              label: dict.list.view,
              primary: true,
              href: `${workspaceUrl}/workflows/${item.id}`,
            },
            {
              label: dict.list.edit,
              primary: false,
              href: `${workspaceUrl}/workflows/${item.id}/settings`,
              hidden: !isResourceAllowed(
                PolicyResource.Workflow,
                PolicyAction.Update,
                item.id
              ),
            },
            {
              label: dict.common.logs,
              primary: false,
              href: `${workspaceUrl}/logs/workflow/${item.id}`,
              hidden: !isResourceAllowed(
                PolicyResource.AuditLog,
                PolicyAction.Read
              ),
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
                  {dict.list.owner}: {item.owner.email}
                  {item.owner.company ? ` (${item.owner.company})` : ''}
                </span>
              </div>,
              <div
                key={`status-${item.id}`}
                className='inline-flex flex-row items-center gap-2'
              >
                <StatusBadge
                  status={item.status}
                  label={item.status ?? dict.workflow.noStatus}
                />
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
                {/* Display tags if they exist */}
                {item.tags && item.tags.length > 0 && (
                  <div className='mt-1'>
                    <WorkspaceTagDisplay
                      tags={item.tags}
                      maxVisible={3}
                      size='sm'
                    />
                  </div>
                )}
              </div>,
            ],
            actions: tableActions.filter((action) => !action.hidden),
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
      headers={[dict.common.name, dict.list.status, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
      emptyStateAction={emptyStateAction}
    />
  );
};

export default memo(ActionWorkflowList);
