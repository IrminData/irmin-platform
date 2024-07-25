'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ActionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

/**
 * Table UI to display a list of action workflows
 *
 * Uses {@link List} and {@link StatusElement} to display a list of action workflows
 */
const ActionTable = ({
  actions,
  inSidebar = false,
}: {
  actions: ActionWorkflow[];
  inSidebar?: boolean;
}) => {
  const { dict, locale } = useLocale();
  const { workspace } = useParams();

  if (!actions || actions.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noActionsFound}
      </div>
    );
  }

  const rows: GridRow[] = actions.map((action, actionIndex) => {
    const tableActions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/actions/viewer/${action.id}`,
      },
      {
        label: dict.list.logs,
        primary: false,
        href: `/portal/${workspace}/actions/viewer/${action.id}/logs`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
      },
    ];
    return {
      columns: [
        <div key={`action-${actionIndex}-name-and-source`}>
          {action.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.source}: {action.workflowable.path}
          </span>
        </div>,
        <StatusElement
          key={`action-${actionIndex}-status`}
          runStatus={action.status ?? 'default'}
          statusLabel={action.status ?? ''}
        />,
        <div key={`action-${action.id}-${actionIndex}-nextSync`}>
          {action.cron_syntax && action.cron_syntax.length > 0 ? (
            <>
              {action.next_run_at
                ? new Date(action.next_run_at).toLocaleString(locale)
                : ''}
              <br />
              <span className='text-xs text-irmin_blue'>
                {dict.list.syncInterval}: {action.cron_syntax}
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
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ActionTable;
