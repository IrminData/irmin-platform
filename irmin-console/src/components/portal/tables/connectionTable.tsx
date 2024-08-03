'use client';

import { useParams } from 'next/navigation';

import List from '@/components/portal/tables/elements/list';
import StatusElement from '@/components/portal/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of connection workflows
 *
 * Uses {@link List} and {@link StatusElement}
 */
const ConnectionTable = ({
  connectionWorkflows,
}: {
  connectionWorkflows: ConnectionWorkflow[];
}) => {
  const { dict, locale } = useLocale();
  const { workspace } = useParams();

  if (!connectionWorkflows || connectionWorkflows.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-sm text-irmin_black'>
        {dict.list.noConnectionsFound}
      </div>
    );
  }

  const rows: GridRow[] = connectionWorkflows.map(
    (connectionWorkflow, connectionIndex) => {
      const actions = [
        {
          label: dict.list.view,
          primary: true,
          href: `/portal/${workspace}/connections/${connectionWorkflow.id}`,
        },
        {
          label: dict.list.edit,
          primary: false,
          href: `/portal/${workspace}/connections/${connectionWorkflow.id}/settings`,
        },
        {
          label: dict.list.logs,
          primary: false,
          href: `/portal/${workspace}/logs/workflow/${connectionWorkflow.id}`,
        },
      ];

      return {
        columns: [
          <div key={`connectionWorkflow-${connectionIndex}-name-and-connector`}>
            {connectionWorkflow.name}
            <br />
            <span className='text-xs text-irmin_blue'>
              {connectionWorkflow.workflowable.connector.name}
            </span>
          </div>,
          <StatusElement
            key={`connectionWorkflow-${connectionIndex}-status`}
            runStatus={connectionWorkflow.status ?? 'default'}
            statusLabel={connectionWorkflow.status ?? ''}
          />,
          <div
            key={`connectionWorkflow-${connectionWorkflow.id}-${connectionIndex}-nextSync`}
          >
            {connectionWorkflow.cron_syntax &&
            connectionWorkflow.cron_syntax.length > 0 ? (
              <>
                {connectionWorkflow.next_run_at
                  ? new Date(connectionWorkflow.next_run_at).toLocaleString(
                      locale
                    )
                  : ''}
                <br />
                <span className='text-xs text-irmin_blue'>
                  {dict.list.syncInterval}: {connectionWorkflow.cron_syntax}
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

export default ConnectionTable;
