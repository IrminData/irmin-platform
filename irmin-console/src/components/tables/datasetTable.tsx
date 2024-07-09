'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import List, { GridRow } from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { DataSet } from '@/types/DataSet';

const DatasetTable = ({
  dataSets,
  inSidebar = false,
}: {
  dataSets: DataSet[];
  inSidebar?: boolean;
}) => {
  const { workspace } = useParams();

  if (!dataSets || dataSets.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        No data sets found for this workspace
      </div>
    );
  }

  const rows: GridRow[] = dataSets.map((dataSet, index) => {
    const actions = [
      {
        label: 'View',
        primary: true,
        href: `/app/${workspace}/data-sets/viewer/${dataSet.id}`,
      },
      {
        label: 'Logs',
        primary: false,
        href: `/app/${workspace}/data-sets/viewer/${dataSet.id}/logs`,
      },
    ];
    if (dataSet.status === 'connected') {
      actions.push(
        {
          label: 'View info',
          primary: false,
          href: `/app/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
        },
        {
          label: 'Disconnect',
          primary: false,
          href: `/app/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
        }
      );
    } else {
      actions.push({
        label: 'Edit',
        primary: false,
        href: `/app/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
      });
    }
    return {
      columns: [
        <div key={`dataset-${index}-name`}>
          {dataSet.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            Source: {dataSet.sourceWorkspace}
          </span>
        </div>,
        <StatusElement
          key={`dataset-${index}-status`}
          accessStatus={dataSet.status}
          statusLabel={dataSet.status}
        />,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={['Name', 'Status', 'Actions']}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default DatasetTable;
