'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import CardOrNormalList from '@/components/ui/list/CardOrNormalList';
import StatusBadge from '@/components/ui/StatusBadge';

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

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const rows: GridRow[] = useMemo(
    () =>
      items.map((item, i) => {
        const actions = [
          {
            label: dict.misc.download.download,
            primary: false,
            href: `${workspaceUrl}/${item.slug}/download`,
          },
          {
            label: dict.list.view,
            primary: true,
            href: `${workspaceUrl}/repositories/${item.slug}`,
          },
        ];

        return {
          columns: [
            <div
              key={`name-and-owner-${i}`}
              className='inline-flex flex-col gap-1'
            >
              <p className='text-base'>
                {item.name}
                {item.is_immutable && (
                  <Badge className='ml-2' variant='secondary'>
                    {dict.list.immutable}
                  </Badge>
                )}
              </p>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                {dict.list.owner}: {item.owner.email}
                {item.owner.company ? ` (${item.owner.company})` : ''}
              </span>
            </div>,
            <div
              key={`status-${i}`}
              className='inline-flex flex-row items-center gap-2'
            >
              <StatusBadge status={'private'} label={'Private'} />
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
      headers={[dict.misc.name, dict.list.status, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default RepositoryList;
