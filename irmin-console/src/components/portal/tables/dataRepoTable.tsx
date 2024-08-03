'use client';

import { useParams } from 'next/navigation';

import List from '@/components/portal/tables/elements/list';
import StatusElement from '@/components/portal/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { DataRepo } from '@/types/api/DataRepo';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of dataRepositories
 *
 * Uses {@link List} and {@link StatusElement} to display a list of dataRepositories
 */
const DataRepoTable = ({
  dataRepositories,
}: {
  dataRepositories: DataRepo[];
}) => {
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!dataRepositories || dataRepositories.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noDataRepositoriesFound}
      </div>
    );
  }

  const rows: GridRow[] = dataRepositories.map((dataRepo, datasetIndex) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/dataRepositories/${dataRepo.id}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/dataRepositories/${dataRepo.id}/settings`,
      },
    ];

    return {
      columns: [
        <div key={`dataRepo-${datasetIndex}-name-source`}>
          {dataRepo.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}:{' '}
            {dataRepo.workflow ? dataRepo.workflow.name : '-'}
          </span>
        </div>,
        <StatusElement
          key={`dataRepo-${datasetIndex}-status`}
          accessStatus={'private'}
          statusLabel={'Private'}
        />,
      ],
      details: (
        <ul>
          {dataRepo.tables.map((table, index) => (
            <li
              key={`dataRepo-${dataRepo.id}-${datasetIndex}-tables-${index}`}
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
      <List
        headers={[dict.list.name, dict.list.status, dict.list.actions]}
        rows={rows}
        hideHeaders={false}
      />
    </div>
  );
};

export default DataRepoTable;
