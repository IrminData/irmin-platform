'use client';

import React from 'react';

import { useParams } from 'next/navigation';

import List from '@/components/tables/elements/list';
import StatusElement from '@/components/tables/elements/statusElement';

import { useLocale } from '@/context/LocaleContext';

import { ActionWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListUI';

const ActionTable = ({
  actions,
  inSidebar = false,
}: {
  actions: ActionWorkflow[];
  inSidebar?: boolean;
}) => {
  const { dict } = useLocale();
  const { workspace } = useParams();

  if (!actions || actions.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.actions.noActionsFound}
      </div>
    );
  }

  const rows: GridRow[] = actions.map((action, index) => {
    const tableActions = [
      {
        label: dict.list.actions.view,
        primary: true,
        href: `/portal/${workspace}/actions/viewer/${action.id}`,
      },
      {
        label: dict.list.actions.logs,
        primary: false,
        href: `/portal/${workspace}/actions/viewer/${action.id}/logs`,
      },
    ];
    // TODO: Add the marketplace and connection logic to types and backend
    // if (action.status === 'connected') {
    //   tableActions.push(
    //     {
    //       label: dict.list.actions.viewInfo,
    //       primary: false,
    //       href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
    //     },
    //     {
    //       label: dict.list.actions.disconnect,
    //       primary: false,
    //       href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
    //     }
    //   );
    // } else {
    //   tableActions.push({
    //     label: dict.list.actions.edit,
    //     primary: false,
    //     href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
    //   });
    // }
    return {
      columns: [
        <div key={`action-${index}-name`}>
          {action.name}
          <br />
          <span className='text-xs text-irmin_blue'>
            {dict.list.actions.source}: {action.workflowable.path}
          </span>
        </div>,
        <StatusElement
          key={`action-${index}-status`}
          runStatus={action.status ?? 'default'}
          statusLabel={action.status}
        />,
      ],
      actions: tableActions,
    };
  });

  return (
    <div className='pb-28'>
      <List
        headers={[
          dict.list.actions.name,
          dict.list.actions.status,
          dict.list.actions.actions,
        ]}
        rows={rows}
        hideHeaders={inSidebar}
      />
    </div>
  );
};

export default ActionTable;
