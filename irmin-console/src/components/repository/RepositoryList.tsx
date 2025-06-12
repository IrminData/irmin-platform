'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import StatusBadge from '@/components/ui/StatusBadge';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Repository } from '@/types/core/Repository';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Table UI to display a list of repositories
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge} to display a list of repositories
 */
const RepositoryList = ({
  loading,
  repositories: items,
}: {
  loading: boolean;
  repositories: Repository[];
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
        const actions = [
          {
            label: dict.list.view,
            primary: true,
            href: `${workspaceUrl}/repositories/${item.slug}`,
          },
          {
            label: dict.common.logs,
            primary: false,
            href: `${workspaceUrl}/logs/repository/${item.slug}`,
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
                {item.is_immutable && (
                  <Badge className='ml-2' variant='secondary'>
                    {dict.list.immutable}
                  </Badge>
                )}
              </div>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                {dict.list.owner}: {item.owner.email}
                {item.owner.company ? ` (${item.owner.company})` : ''}
              </span>
            </div>,
            <div
              key={`status-${i}`}
              className='inline-flex flex-row items-center gap-2'
            >
              {/* Status */}
              <StatusBadge status={'private'} label={'Private'} />
              {/* Last updated and created at */}
              <div className='flex flex-col'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {dict.list.lastUpdated}
                  {': '}
                  {new Date(item.updated_at).toLocaleString(locale)}
                </span>
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {dict.list.createdAt}
                  {': '}
                  {new Date(item.created_at).toLocaleString(locale)}
                </span>
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
          actions,
          details: (
            <p className='max-w-sm pb-4 text-sm text-gray-600 dark:text-gray-400'>
              {item.description}
            </p>
          ),
        };
      }),
    [items, workspaceUrl, dict, locale]
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

export default RepositoryList;
