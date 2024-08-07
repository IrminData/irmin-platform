'use client';

import { useParams } from 'next/navigation';

import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/NormalListProps';

/**
 * Table UI to display a list of Connection Workflows
 *
 * Uses {@link NormalList} and {@link StatusBadge}
 */
const ConnectionWorkflowList = ({
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
          href: `/portal/${workspace}/workflows/connections/${connectionWorkflow.id}`,
        },
        {
          label: dict.list.edit,
          primary: false,
          href: `/portal/${workspace}/workflows/connections/${connectionWorkflow.id}/settings`,
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
          <StatusBadge
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

export default ConnectionWorkflowList;
