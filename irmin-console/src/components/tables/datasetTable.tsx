'use client';

import { useParams } from 'next/navigation';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { Dataset } from '@/types/api/Dataset';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of datasets
 *
 * Uses {@link List} and {@link StatusElement} to display a list of datasets
 */
const DatasetTable = ({ datasets }: { datasets: Dataset[] }) => {
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!datasets || datasets.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noDatasetsFound}
      </div>
    );
  }

  const rows: GridRow[] = datasets.map((dataset, datasetIndex) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/datasets/${dataset.id}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/datasets/${dataset.id}/settings`,
      },
    ];

    return {
      columns: [
        <div key={`dataset-${datasetIndex}-name-source`}>
          {dataset.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}: {dataset.workflow ? dataset.workflow.name : '-'}
          </span>
        </div>,
        <StatusElement
          key={`dataset-${datasetIndex}-status`}
          accessStatus={'private'}
          statusLabel={'Private'}
        />,
      ],
      details: (
        <ul>
          {dataset.tables.map((table, index) => (
            <li
              key={`dataset-${dataset.id}-${datasetIndex}-tables-${index}`}
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

export default DatasetTable;
