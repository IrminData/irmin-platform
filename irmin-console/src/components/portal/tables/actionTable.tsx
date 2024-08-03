'use client';

import { useParams } from 'next/navigation';

import List from '@/components/portal/tables/elements/list';
import StatusElement from '@/components/portal/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ActionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of action workflows
 *
 * Uses {@link List} and {@link StatusElement}
 */
const ActionTable = ({
  actionWorkflows,
}: {
  actionWorkflows: ActionWorkflow[];
}) => {
  const { dict, locale } = useLocale();
  const { workspace } = useParams();

  if (!actionWorkflows || actionWorkflows.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noActionsFound}
      </div>
    );
  }

  const rows: GridRow[] = actionWorkflows.map((actionWorkflow, actionIndex) => {
    const tableActions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/actions/${actionWorkflow.id}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/actions/${actionWorkflow.id}/settings`,
      },
      {
        label: dict.list.logs,
        primary: false,
        href: `/portal/${workspace}/logs/workflow/${actionWorkflow.id}`,
      },
    ];
    return {
      columns: [
        <div key={`actionWorkflow-${actionIndex}-name-and-source`}>
          {actionWorkflow.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}: {actionWorkflow.workflowable.path}
          </span>
        </div>,
        <StatusElement
          key={`actionWorkflow-${actionIndex}-status`}
          runStatus={actionWorkflow.status ?? 'default'}
          statusLabel={actionWorkflow.status ?? ''}
        />,
        <div
          key={`actionWorkflow-${actionWorkflow.id}-${actionIndex}-nextSync`}
        >
          {actionWorkflow.cron_syntax &&
          actionWorkflow.cron_syntax.length > 0 ? (
            <>
              {actionWorkflow.next_run_at
                ? new Date(actionWorkflow.next_run_at).toLocaleString(locale)
                : ''}
              <br />
              <span className='text-xs text-irmin_blue'>
                {dict.list.syncInterval}: {actionWorkflow.cron_syntax}
              </span>
            </>
          ) : (
            dict.list.notScheduled
          )}
        </div>,
      ],
      actions: tableActions,
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
        hideHeaders={false}
      />
    </div>
  );
};

export default ActionTable;
