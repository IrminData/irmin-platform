'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import List, { GridRow } from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { DataSet } from '@/types/DataSet';

const DatasetTable = ({
  dataSets,
  inSidebar = false,
}: {
  dataSets: DataSet[];
  inSidebar?: boolean;
}) => {
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!dataSets || dataSets.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.dataSets.noDataSetsFound}
      </div>
    );
  }

  const rows: GridRow[] = dataSets.map((dataSet, index) => {
    const actions = [
      {
        label: dict.list.dataSets.view,
        primary: true,
        href: `/portal/${workspace}/data-sets/viewer/${dataSet.id}`,
      },
      {
        label: dict.list.dataSets.logs,
        primary: false,
        href: `/portal/${workspace}/data-sets/viewer/${dataSet.id}/logs`,
      },
    ];
    if (dataSet.status === 'connected') {
      actions.push(
        {
          label: dict.list.dataSets.viewInfo,
          primary: false,
          href: `/portal/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
        },
        {
          label: dict.list.dataSets.disconnect,
          primary: false,
          href: `/portal/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
        }
      );
    } else {
      actions.push({
        label: dict.list.dataSets.edit,
        primary: false,
        href: `/portal/${workspace}/data-sets/viewer/${dataSet.id}/settings`,
      });
    }
    return {
      columns: [
        <div key={`dataset-${index}-name`}>
          {dataSet.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.dataSets.source}: {dataSet.sourceWorkspace}
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
        headers={[
          dict.list.dataSets.name,
          dict.list.dataSets.status,
          dict.list.dataSets.actions,
        ]}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default DatasetTable;
