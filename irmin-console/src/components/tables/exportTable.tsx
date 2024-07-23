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
  const { dict } = useLocale();

  if (!processes || processes.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.export.noExportProcessesFound}
      </div>
    );
  }

  const rows: GridRow[] = processes.map((process, processIndex) => {
    const actions = [
      {
        label: dict.list.export.logs,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.export.edit,
        primary: false,
        href: `#`,
      },
      {
        label: dict.list.export.remove,
        primary: false,
        href: `#`,
      },
    ];

    return {
      columns: [
        <div
          className='align-center flex flex-row justify-between'
          key={`export-sync-${process.id}-${processIndex}-name-and-status`}
        >
          <div>{process.name}</div>
          <StatusElement
            runStatus={process.status}
            statusLabel={process.status}
          />
        </div>,
        <div
          key={`export-sync-${process.id}-${processIndex}-source-and-destination`}
        >
          {dict.list.export.source}: {process.workflowable.source.name} <br />
          {dict.list.export.destination}:{' '}
          {process.workflowable.destination.connector.name}
        </div>,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={[
          dict.list.export.name,
          dict.list.export.sourceAndDestination,
          dict.list.export.actions,
        ]}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ExportTable;
