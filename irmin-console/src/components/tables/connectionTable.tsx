'use client';

import React from 'react';

import List, { GridRow } from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

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

  const rows: GridRow[] = connections.map((connection, connectionIndex) => {
    const actions = [
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
    ];

    return {
      columns: [
        <div
          className='align-center flex flex-row justify-between'
          key={`connection-${connection.id}-${connectionIndex}-name-and-status`}
        >
          <div>
            {connection.name}
            <br />
            <span className='text-xs text-irmin_blue'>
              {connection.connector}
            </span>
          </div>
          <StatusElement
            runStatus={connection.status}
            statusLabel={connection.status}
          />
        </div>,
        <div key={`connection-${connection.id}-${connectionIndex}-nextSync`}>
          {connection.nextSync}
          <br />
          <span className='text-xs text-irmin_blue'>
            {connection.nextSyncTimestamp.toUTCString()}
          </span>
        </div>,
      ],
      details: (
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
      ),
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={['Name', 'Next sync', 'Actions']}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ConnectionTable;
