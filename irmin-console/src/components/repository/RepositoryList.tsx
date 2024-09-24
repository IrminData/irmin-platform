'use client';

import { useParams } from 'next/navigation';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

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
  const { workspace } = useParams();

  const rows: GridRow[] = items.map((item, i) => {
    const actions = [
      {
        label: dict.repository.download.download,
        primary: false,
        href: `/${locale}/console/${workspace}/repositories/${item.slug}/download`,
      },
      {
        label: dict.list.view,
        primary: true,
        href: `/${locale}/console/${workspace}/repositories/${item.slug}`,
      },
    ];

    return {
      columns: [
        <div key={`name-and-owner-${i}`} className='inline-flex flex-col gap-1'>
          <p className='text-base'>
            {item.name}
            {item.is_immutable && (
              <span className='ml-2 rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                {dict.list.immutable}
              </span>
            )}
          </p>
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            {dict.list.owner}: {item.owner.name}
            {item.owner.company ? ` (${item.owner.company})` : ''}
          </span>
        </div>,
        <div
          key={`status-${i}`}
          className='inline-flex flex-row items-center gap-2'
        >
          <StatusBadge accessStatus={'private'} statusLabel={'Private'} />
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
  });

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.list.name, dict.list.status, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default RepositoryList;
