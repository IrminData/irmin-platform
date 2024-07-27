'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ExportWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of export workflows
 *
 * @remarks
 *
 * Uses {@link List} and {@link StatusElement} to display a list of export workflows.
 */
const ExportTable = ({
  exportWorkflows,
}: {
  exportWorkflows: ExportWorkflow[];
}) => {
  const { workspace } = useParams();
  const { dict, locale } = useLocale();

  if (!exportWorkflows || exportWorkflows.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noExportProcessesFound}
      </div>
    );
  }

  const rows: GridRow[] = exportWorkflows.map(
    (exportWorkflow, processIndex) => {
      const actions = [
        {
          label: dict.list.view,
          primary: true,
          href: `/portal/${workspace}/connections/${exportWorkflow.id}`,
        },
        {
          label: dict.list.edit,
          primary: false,
          href: `/portal/${workspace}/connections/${exportWorkflow.id}/settings`,
        },
        {
          label: dict.list.logs,
          primary: false,
          href: `/portal/${workspace}/logs/workflow/${exportWorkflow.id}`,
        },
      ];

      return {
        columns: [
          <div
            key={`export-sync-${exportWorkflow.id}-${processIndex}-name-source-destination`}
          >
            {exportWorkflow.name}
            <br />
            <span className='text-xs text-irmin_blue'>
              {dict.list.source}: {exportWorkflow.workflowable.source.name}
            </span>
            <br />
            <span className='text-xs text-irmin_blue'>
              {dict.list.destination}:{' '}
              {exportWorkflow.workflowable.destination.connector.name}
            </span>
          </div>,
          <StatusElement
            key={`export-sync-${exportWorkflow.id}-${processIndex}-status`}
            runStatus={exportWorkflow.status}
            statusLabel={exportWorkflow.status}
          />,
          <div
            key={`export-sync-${exportWorkflow.id}-${processIndex}-nextSync`}
          >
            {exportWorkflow.cron_syntax &&
            exportWorkflow.cron_syntax.length > 0 ? (
              <>
                {exportWorkflow.next_run_at
                  ? new Date(exportWorkflow.next_run_at).toLocaleString(locale)
                  : ''}
                <br />
                <span className='text-xs text-irmin_blue'>
                  {dict.list.syncInterval}: {exportWorkflow.cron_syntax}
                </span>
              </>
            ) : (
              dict.list.notScheduled
            )}
          </div>,
        ],
        actions,
      };
    }
  );

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
        hideHeaders={false}
      />
    </div>
  );
};

export default ExportTable;
