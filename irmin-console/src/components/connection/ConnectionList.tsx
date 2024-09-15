'use client';

import { useParams } from 'next/navigation';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';

import { useLocale } from '@/context/LocaleContext';

import { Connection } from '@/types/api/Connection';
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
  const { workspace } = useParams();

  if (!loading && (!items || items.length === 0)) {
    return (
      <div className='px-4 py-12 text-center text-sm text-irmin_black'>
        {dict.list.noConnectionsFound}
      </div>
    );
  }

  const rows: GridRow[] = items.map((item, i) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/${locale}/portal/${workspace}/connections/${item.slug}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/${locale}/portal/${workspace}/connections/${item.slug}/settings`,
      },
    ];

    return {
      columns: [
        <div
          key={`item-${i}-name-description-owner`}
          className='inline-flex flex-col gap-1'
        >
          <span className='text-xs text-gray-400'>
            {dict.list.owner}: {item.owner.name}
          </span>
          <p className='text-base'>{item.name}</p>
          {item.description && item.description.length > 0 && (
            <p className='max-w-72 text-xs text-gray-400'>
              {item.description.substring(0, 120).trim()}
            </p>
          )}
        </div>,
        <div className='inline-flex flex-col gap-1' key={`item-${i}-connector`}>
          <p className='text-base'>{item.connector.name}</p>
        </div>,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <CardOrNormalList
        loading={loading}
        headers={[dict.list.name, dict.list.connector, dict.list.actions]}
        rows={rows}
        hideHeaders={false}
      />
    </div>
  );
};

export default ConnectionList;
