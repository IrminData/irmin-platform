'use client';

import React from 'react';

import List, { GridRow } from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

interface ExportProcess {
  id: number;
  name: string;
  source: string;
  destination: string;
  status: 'error' | 'warning' | 'running' | 'paused' | 'default';
  details: string[];
}

interface ExportTableProps {
  processes: ExportProcess[];
  inSidebar?: boolean;
}

const ExportTable: React.FC<ExportTableProps> = ({
  processes,
  inSidebar = false,
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
          {dict.list.export.source}: {process.source} <br />
          {dict.list.export.destination}: {process.destination}
        </div>,
      ],
      details: (
        <ul>
          {process.details.map((detail, index) => (
            <li
              key={`export-sync-${process.id}-${processIndex}-details-${index}`}
              className='border-color-irmin_green border-b py-2 text-xs md:text-sm xl:text-base'
            >
              {detail}
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
