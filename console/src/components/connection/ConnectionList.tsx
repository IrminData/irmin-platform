'use client';

import { useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';

import { useBaseUrl } from '@/hooks/utils';

import type { Connection } from '@/types/core/Connection';
import type {
  EmptyStateAction,
  GridRow,
  TableRowAction,
} from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Connections
 *
 * Uses {@link CardOrNormalList}
 */
const ConnectionList = ({
  loading,
  connections: items,
  emptyStateAction,
}: {
  loading?: boolean;
  connections: Connection[];
  emptyStateAction?: EmptyStateAction;
}) => {
  const { dict } = useLocale();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const rows: GridRow[] = useMemo(
    () =>
      items.map((item) => {
        const actions: TableRowAction[] = [
          {
            label: dict.common.view,
            primary: true,
            href: `${workspaceUrl}/connections/${item.id}`,
          },
          {
            label: dict.common.edit,
            primary: false,
            href: `${workspaceUrl}/connections/${item.id}/settings`,
          },
          {
            label: dict.common.logs,
            primary: false,
            href: `${workspaceUrl}/logs/connection/${item.id}`,
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
              </span>
            </div>,
            <div
              key={`connector-${item.id}`}
              className='inline-flex flex-row items-center gap-2'
            >
              <Avatar className={`size-8`}>
                <AvatarImage
                  src={item.connector.logo_url}
                  alt={item.connector.name}
                />
                <AvatarFallback>
                  {item.connector.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className='text-sm'>{item.connector.name}</p>
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
          actions,
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
      }),
    [items, dict, workspaceUrl]
  );

  return (
    <CardOrNormalList
      loading={loading}
      headers={[
        dict.common.name,
        dict.connectors.connector,
        dict.common.actions,
      ]}
      rows={rows}
      hideHeaders={false}
      emptyStateTitle={dict.list.emptyState.connections.title}
      emptyStateDescription={dict.list.emptyState.connections.description}
      emptyStateAction={emptyStateAction}
    />
  );
};

export default ConnectionList;
