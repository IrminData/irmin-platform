'use client';

import { useParams } from 'next/navigation';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { ExportWorkflow } from '@/types/api/Workflow';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Export Workflows
 *
 * @remarks
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge} to display a list of Export Workflows.
 */
const ExportWorkflowList = ({
  loading,
  exportWorkflows: items,
}: {
  loading: boolean;
  exportWorkflows: ExportWorkflow[];
}) => {
  const { workspace } = useParams();
  const { dict, locale } = useLocale();

  if (!loading && (!items || items.length === 0)) {
    return (
      <div className='px-4 py-12 text-center text-xl text-irmin_black'>
        {dict.list.noExportProcessesFound}
      </div>
    );
  }

  const rows: GridRow[] = items.map((item, i) => {
    const actions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/portal/${workspace}/workflows/exports/${item.id}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/portal/${workspace}/workflows/exports/${item.id}/settings`,
      },
      {
        label: dict.list.logs,
        primary: false,
        href: `/portal/${workspace}/logs/workflow/${item.id}`,
      },
    ];

    return {
      columns: [
        <div
          key={`item-${i}-name-description-owner`}
          className='inline-flex flex-col gap-1'
        >
          <span className='text-xs text-gray-400'>
            {dict.list.owner}: {item.owner.name}
          </span>
          <p className='text-base'>{item.name}</p>
          {item.description && item.description.length > 0 && (
            <p className='max-w-72 text-xs text-gray-400'>
              {item.description.substring(0, 120).trim()}
            </p>
          )}
        </div>,
        <div
          key={`item-${item.id}-${i}-schedule-and-status`}
          className='inline-flex flex-row items-center justify-between gap-2 md:flex-row-reverse'
        >
          <div className='hidden flex-col gap-1 md:inline-flex'>
            <span className='text-xs text-gray-400'>
              {dict.list.syncInterval}:{' '}
              {item.cron_syntax ? item.cron_syntax : dict.list.notScheduled}
            </span>
            <span className='text-xs text-gray-400'>
              {dict.list.prevSync}
              {': '}
              {item.last_run_at
                ? new Date(item.last_run_at).toLocaleString(locale)
                : '-'}
            </span>
            <span className='text-xs text-gray-400'>
              {dict.list.nextSync}
              {': '}
              {item.next_run_at
                ? new Date(item.next_run_at).toLocaleString(locale)
                : '-'}
            </span>
          </div>
          <StatusBadge
            key={`item-${item.id}-${i}-status`}
            runStatus={item.status}
            statusLabel={item.status}
          />
        </div>,
      ],
      actions,
    };
  });

  return (
    <div className='pb-28'>
      <CardOrNormalList
        loading={loading}
        headers={[
          dict.list.name,
          `${dict.list.runs} & ${dict.list.status}`,
          dict.list.actions,
        ]}
        rows={rows}
        hideHeaders={false}
      />
    </div>
  );
};

export default ExportWorkflowList;
