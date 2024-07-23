'use client';

import React from 'react';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

const ConnectionTable = ({
  connections,
  inSidebar = false,
}: {
  connections: ConnectionWorkflow[];
  inSidebar?: boolean;
}) => {
  const { dict } = useLocale();

  if (!connections || connections.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-sm text-irmin_black'>
        {dict.list.connection.noConnectionsFound}
      </div>
    );
  }

  const rows: GridRow[] = connections.map((connection, connectionIndex) => {
    const actions = [
      {
        label: dict.list.connection.view,
        primary: true,
        href: `#`,
      },
      {
        label: dict.list.connection.logs,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.connection.edit,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.connection.remove,
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
              {connection.workflowable.connector.name}
            </span>
          </div>
          <StatusElement
            runStatus={connection.status ?? 'default'}
            statusLabel={connection.status ?? ''}
          />
        </div>,
        <div key={`connection-${connection.id}-${connectionIndex}-nextSync`}>
          {connection.cron_syntax && connection.cron_syntax.length > 0
            ? connection.cron_syntax
            : dict.list.connection.notScheduled}
        </div>,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={[
          dict.list.connection.name,
          dict.list.connection.nextSync,
          dict.list.connection.actions,
        ]}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ConnectionTable;
