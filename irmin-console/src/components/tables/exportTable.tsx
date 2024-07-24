'use client';

import React from 'react';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ExportWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

const ExportTable = ({
  processes,
  inSidebar = false,
}: {
  processes: ExportWorkflow[];
  inSidebar?: boolean;
}) => {
  const { dict, locale } = useLocale();

  if (!processes || processes.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noExportProcessesFound}
      </div>
    );
  }

  const rows: GridRow[] = processes.map((process, processIndex) => {
    const actions = [
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
        <div
          key={`export-sync-${process.id}-${processIndex}-name-source-destination`}
        >
          {process.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}: {process.workflowable.source.name}
          </span>
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.destination}:{' '}
            {process.workflowable.destination.connector.name}
          </span>
        </div>,
        <StatusElement
          key={`export-sync-${process.id}-${processIndex}-status`}
          runStatus={process.status}
          statusLabel={process.status}
        />,
        <div key={`export-sync-${process.id}-${processIndex}-nextSync`}>
          {process.cron_syntax && process.cron_syntax.length > 0 ? (
            <>
              {process.next_run_at
                ? new Date(process.next_run_at).toLocaleString(locale)
                : ''}
              <br />
              <span className='text-xs text-irmin_blue'>
                {dict.list.syncInterval}: {process.cron_syntax}
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

export default ExportTable;
