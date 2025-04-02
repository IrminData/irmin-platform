'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import CardOrNormalList from '@/components/ui/list/CardOrNormalList';

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
  loading?: boolean;
  connections: Connection[];
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
                {dict.list.owner}: {item.owner.email}
              </span>
            </div>,
            <div
              key={`connector-${i}`}
              className='inline-flex flex-row items-center gap-2'
            >
              <Image
                src={item.connector.logo_url}
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
            </div>
          ),
        };
      }),
    [items, dict, workspaceUrl]
  );

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.common.name, dict.connectors.connector, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default ConnectionList;
