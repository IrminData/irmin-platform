'use client';

import React from 'react';

import StatusElement from '@/components/tables/elements/statusElement';
import TableList from '@/components/tables/elements/tableList';
import TableListRow from '@/components/tables/elements/tableListRow';

interface ReverseETLProcess {
  id: number;
  name: string;
  source: string;
  destination: string;
  status: 'error' | 'warning' | 'running' | 'paused' | 'default';
  details: string[];
}

interface ReverseETLTableProps {
  processes: ReverseETLProcess[];
  inSidebar?: boolean;
}

const ReverseETLTable: React.FC<ReverseETLTableProps> = ({
  processes,
  inSidebar = false,
}) => {
  if (!processes || processes.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        No Reverse ETL processes found for this workspace
      </div>
    );
  }

  return (
    <TableList
      headers={['Name', 'Status', 'Source & Destination']}
      inSidebar={inSidebar}
    >
      {processes.map((process, processIndex) => (
        <TableListRow
          key={`reverse-etl-${process.id}-${processIndex}`}
          details={
            <ul>
              {process.details.map((detail, index) => (
                <li
                  key={`reverse-etl-${process.id}-${processIndex}-details-${index}`}
                  className='border-color-irmin_green border-b py-2 text-xs md:text-sm xl:text-base'
                >
                  {detail}
                </li>
              ))}
            </ul>
          }
          actions={[
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
          <div>{process.name}</div>
          <StatusElement
            runStatus={process.status}
            statusLabel={process.status}
          />
          <div>
            Source: {process.source} <br />
            Destination: {process.destination}
          </div>
        </TableListRow>
      ))}
    </TableList>
  );
};

export default ReverseETLTable;
