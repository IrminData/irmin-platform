'use client';

import React from 'react';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of connection workflows
 *
 * Uses {@link List} and {@link StatusElement} to display a list of connection workflows
 */
const ConnectionTable = ({
  connections,
  inSidebar = false,
}: {
  connections: ConnectionWorkflow[];
  inSidebar?: boolean;
}) => {
  const { dict, locale } = useLocale();

  if (!connections || connections.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-sm text-irmin_black'>
        {dict.list.noConnectionsFound}
      </div>
    );
  }

  const rows: GridRow[] = connections.map((connection, connectionIndex) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `#`,
      },
      {
        label: dict.list.logs,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.remove,
        primary: false,
        href: `#`,
      },
    ];

    return {
      columns: [
        <div key={`connection-${connectionIndex}-name-and-connector`}>
          {connection.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {connection.workflowable.connector.name}
          </span>
        </div>,
        <StatusElement
          key={`connection-${connectionIndex}-status`}
          runStatus={connection.status ?? 'default'}
          statusLabel={connection.status ?? ''}
        />,
        <div key={`connection-${connection.id}-${connectionIndex}-nextSync`}>
          {connection.cron_syntax && connection.cron_syntax.length > 0 ? (
            <>
              {connection.next_run_at
                ? new Date(connection.next_run_at).toLocaleString(locale)
                : ''}
              <br />
              <span className='text-xs text-irmin_blue'>
                {dict.list.syncInterval}: {connection.cron_syntax}
              </span>
            </>
          ) : (
            dict.list.notScheduled
          )}
        </div>,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={[
          dict.list.name,
          dict.list.status,
          dict.list.nextSync,
          dict.list.actions,
        ]}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ConnectionTable;
