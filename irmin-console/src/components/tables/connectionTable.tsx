'use client';

import React from 'react';

import StatusElement from '@/components/tables/elements/statusElement';
import TableList from '@/components/tables/elements/tableList';
import TableListRow from '@/components/tables/elements/tableListRow';

import { ConnectionWithAdditionalData } from '@/types/Connection';

const ConnectionTable = ({
  connections,
  inSidebar = false,
}: {
  connections: ConnectionWithAdditionalData[];
  inSidebar?: boolean;
}) => {
  if (!connections || connections.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        No connections found for this workspace
      </div>
    );
  }

  return (
    <TableList headers={['Name', 'Next sync', 'Status']} inSidebar={inSidebar}>
      {connections.map((connection, connectionIndex) => (
        <TableListRow
          key={`connection-${connection.id}-${connectionIndex}`}
          details={
            <ul>
              {connection.parts.map((part, index) => (
                <li
                  key={`connection-${connection.id}-${connectionIndex}-details-${index}`}
                  className='border-color-irmin_green border-b py-2 text-xs md:text-sm xl:text-base'
                >
                  {part}
                </li>
              ))}
            </ul>
          }
          actions={[
            {
              label: 'View',
              primary: true,
              href: `#`,
            },
            {
              label: 'Logs',
              primary: false,
              href: `#`,
            },
            {
              label: 'Edit',
              primary: false,
              href: `#`,
            },
            {
              label: 'Remove',
              primary: false,
              href: `#`,
            },
          ]}
          inSidebar={inSidebar}
        >
          <div>
            {connection.name}
            <br />
            <span className='text-xs text-irmin_blue'>
              {connection.connector}
            </span>
          </div>
          <div>
            {connection.nextSync}
            <br />
            <span className='text-xs text-irmin_blue'>
              {connection.nextSyncTimestamp.toUTCString()}
            </span>
          </div>
          <StatusElement
            runStatus={connection.status}
            statusLabel={connection.status}
          />
        </TableListRow>
      ))}
    </TableList>
  );
};

export default ConnectionTable;
