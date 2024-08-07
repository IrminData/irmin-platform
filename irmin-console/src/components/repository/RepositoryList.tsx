'use client';

import { useParams } from 'next/navigation';

import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';
import { GridRow } from '@/types/internal/NormalListProps';

/**
 * Table UI to display a list of repositories
 *
 * Uses {@link NormalList} and {@link StatusBadge} to display a list of repositories
 */
const RepositoryList = ({ repositories }: { repositories: Repository[] }) => {
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!repositories || repositories.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noRepositoriesFound}
      </div>
    );
  }

  const rows: GridRow[] = repositories.map((repo, repoIndex) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/repositories/${repo.slug}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/repositories/${repo.slug}/settings`,
      },
    ];

    return {
      columns: [
        <div key={`repo-${repoIndex}-name-source`}>
          {repo.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}: {repo.workflow ? repo.workflow.name : '-'}
          </span>
        </div>,
        <StatusBadge
          key={`repo-${repoIndex}-status`}
          accessStatus={'private'}
          statusLabel={'Private'}
        />,
      ],
      details: (
        <ul>
          {repo.tables.map((table, index) => (
            <li
              key={`repo-${repo.id}-${repoIndex}-tables-${index}`}
              className='border-color-irmin_green border-b py-2 text-xs md:text-sm xl:text-base'
            >
              {table}
            </li>
          ))}
        </ul>
      ),
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <NormalList
        headers={[dict.list.name, dict.list.status, dict.list.actions]}
        rows={rows}
        hideHeaders={false}
      />
    </div>
  );
};

export default RepositoryList;
