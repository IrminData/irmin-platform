'use client';

import { useParams } from 'next/navigation';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';
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
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!loading && (!items || items.length === 0)) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noRepositoriesFound}
      </div>
    );
  }

  const rows: GridRow[] = items.map((item, i) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/repositories/${item.slug}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/repositories/${item.slug}/settings`,
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
          <p className='text-base'>
            {item.name}
            {(item.workflow || item.is_immutable) && (
              <span className='ml-2 rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                {item.is_immutable
                  ? dict.list.immutable
                  : dict.list.managedByWorkflow}
              </span>
            )}
          </p>
          {item.description && item.description.length > 0 && (
            <p className='max-w-72 text-xs text-gray-400'>
              {item.description.substring(0, 120).trim()}
            </p>
          )}
        </div>,
        <StatusBadge
          key={`item-${i}-status`}
          accessStatus={'private'}
          statusLabel={'Private'}
        />,
      ],
      details: (
        <ul>
          {item.tables.map((table, index) => (
            <li
              key={`item-${item.id}-${i}-tables-${index}`}
              className='border-b border-gray-100 py-2 text-xs dark:border-gray-800'
            >
              {/* Only show part of the table name between first and last dots */}
              {table.split('.').slice(1, -1).join('.')}
            </li>
          ))}
        </ul>
      ),
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <CardOrNormalList
        loading={loading}
        headers={[dict.list.name, dict.list.status, dict.list.actions]}
        rows={rows}
        hideHeaders={false}
      />
    </div>
  );
};

export default RepositoryList;
