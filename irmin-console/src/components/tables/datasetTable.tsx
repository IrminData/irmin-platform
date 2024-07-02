'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import StatusElement from '@/components/tables/elements/statusElement';
import TableList from '@/components/tables/elements/tableList';
import TableListRow from '@/components/tables/elements/tableListRow';

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

  return (
    <TableList headers={['Name', 'Status']} inSidebar={inSidebar}>
      {dataSets.map((dataSet, index) => {
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

        return (
          <TableListRow
            key={`data-set-${dataSet.id}-${index}`}
            actions={actions}
            inSidebar={inSidebar}
          >
            <div>
              {dataSet.name}
              <br />
              <span className='text-xs text-irmin_blue'>
                Source: {dataSet.sourceWorkspace}
              </span>
            </div>
            <StatusElement
              accessStatus={dataSet.status}
              statusLabel={dataSet.status}
            />
          </TableListRow>
        );
      })}
    </TableList>
  );
};

export default DatasetTable;
