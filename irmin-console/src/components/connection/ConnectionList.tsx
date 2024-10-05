'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Connection } from '@/types/core/Connection';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Connections
 *
 * Uses {@link CardOrNormalList}
 */
const ConnectionList = ({
  loading,
  connections: items,
}: {
  loading: boolean;
  connections: Connection[];
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
            label: dict.list.view,
            primary: true,
            href: `${workspaceUrl}/connections/${item.id}`,
          },
          {
            label: dict.list.edit,
            primary: false,
            href: `${workspaceUrl}/connections/${item.id}/settings`,
          },
        ];

        return {
          columns: [
            <div
              key={`name-and-owner-${i}`}
              className='inline-flex flex-col gap-1'
            >
              <p className='text-base'>{item.name}</p>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                {dict.list.owner}: {item.owner.name}
                {item.owner.company ? ` (${item.owner.company})` : ''}
              </span>
            </div>,
            <div
              key={`connector-${i}`}
              className='inline-flex flex-row items-center gap-2'
            >
              <Image
                src={item.connector.logo}
                alt={item.connector.name}
                className='h-8 w-8 object-contain'
                width={32}
                height={32}
              />
              <p className='text-sm'>{item.connector.name}</p>
            </div>,
          ],
          actions,
          details: (
            <div className='flex max-w-sm flex-col text-gray-600 dark:text-gray-400'>
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
    [items, dict, locale, workspaceUrl]
  );

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.list.name, dict.list.connector, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default ConnectionList;
