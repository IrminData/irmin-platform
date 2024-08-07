'use client';

import { useParams } from 'next/navigation';

import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { ExportWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/NormalListProps';

/**
 * Table UI to display a list of Export Workflows
 *
 * @remarks
 *
 * Uses {@link NormalList} and {@link StatusBadge} to display a list of Export Workflows.
 */
const ExportWorkflowList = ({
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
          href: `/portal/${workspace}/workflows/exports/${exportWorkflow.id}`,
        },
        {
          label: dict.list.edit,
          primary: false,
          href: `/portal/${workspace}/workflows/exports/${exportWorkflow.id}/settings`,
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
            key={`export-workflow-${exportWorkflow.id}-${processIndex}-name-source-destination`}
          >
            {exportWorkflow.name}
            <br />
            <span className='text-xs text-irmin_blue'>
              {dict.list.source}: {exportWorkflow.workflowable.source.name}
            </span>
            <br />
            <span className='text-xs text-irmin_blue'>
              {dict.list.destination}:{' '}
              {
                exportWorkflow.workflowable.destination.workflowable.connector
                  .name
              }
            </span>
          </div>,
          <StatusBadge
            key={`export-workflow-${exportWorkflow.id}-${processIndex}-status`}
            runStatus={exportWorkflow.status}
            statusLabel={exportWorkflow.status}
          />,
          <div
            key={`export-workflow-${exportWorkflow.id}-${processIndex}-nextSync`}
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
      <NormalList
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

export default ExportWorkflowList;
