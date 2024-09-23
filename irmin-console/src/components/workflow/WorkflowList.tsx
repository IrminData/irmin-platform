'use client';

import { useParams } from 'next/navigation';

import CardOrNormalList from '@/components/common/list/CardOrNormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';

import { Workflow } from '@/types/core/Workflow';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Table UI to display a list of Workflows of all types
 *
 * Uses {@link CardOrNormalList} and {@link StatusBadge}
 */
const WorkflowList = ({
  loading,
  workflows: items,
}: {
  loading: boolean;
  workflows: Workflow[];
}) => {
  const { dict, locale } = useLocale();
  const { workspace } = useParams();

  const rows: GridRow[] = items.map((item, i) => {
    const tableActions = [
      {
        label: dict.list.view,
        primary: true,
        href: `/${locale}/console/${workspace}/workflows/${item.slug}`,
      },
      {
        label: dict.list.edit,
        primary: false,
        href: `/${locale}/console/${workspace}/workflows/${item.slug}/settings`,
      },
      {
        label: dict.list.logs,
        primary: false,
        href: `/${locale}/console/${workspace}/logs/workflow/${item.slug}`,
      },
    ];
    return {
      columns: [
        <div key={`name-and-owner-${i}`} className='inline-flex flex-col gap-1'>
          <p className='text-base'>
            {item.name}
            <span className='ml-2 rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
              {item.workflowable_type === 'action' && dict.workflow.action}
              {item.workflowable_type === 'import' && dict.workflow.import}
              {item.workflowable_type === 'export' && dict.workflow.export}
            </span>
          </p>
          <span className='text-sm text-gray-400'>
            {dict.list.owner}: {item.owner.name}
            {item.owner.company ? ` (${item.owner.company})` : ''}
          </span>
        </div>,
        <div
          key={`status-${i}`}
          className='inline-flex flex-row items-center gap-2'
        >
          <StatusBadge runStatus={item.status} statusLabel={item.status} />
          <div className='flex flex-col'>
            {item.cron_syntax && item.cron_syntax.length > 0 ? (
              <>
                <span className='text-xs text-gray-400'>
                  {dict.list.nextRun}
                  {': '}
                  {item.next_run_at
                    ? new Date(item.next_run_at).toLocaleString(locale)
                    : '-'}
                </span>
                <span className='text-xs text-gray-400'>
                  {dict.list.prevRun}
                  {': '}
                  {item.last_run_at
                    ? new Date(item.last_run_at).toLocaleString(locale)
                    : '-'}
                </span>
              </>
            ) : (
              <span className='text-xs text-gray-400'>
                {dict.list.notScheduled}
              </span>
            )}
          </div>
        </div>,
      ],
      actions: tableActions,
      details: (
        <div className='flex max-w-sm flex-col text-gray-400'>
          <p className='pb-4 text-sm'>{item.description}</p>
          <p className='pb-1 text-xs'>
            {dict.list.lastUpdated}
            {': '}
            {new Date(item.updated_at).toLocaleString(locale)}
          </p>
          <p className='text-xs'>
            {dict.list.createdAt}
            {': '}
            {new Date(item.created_at).toLocaleString(locale)}
          </p>
        </div>
      ),
    };
  });

  return (
    <CardOrNormalList
      loading={loading}
      headers={[dict.list.name, dict.list.status, dict.list.actions]}
      rows={rows}
      hideHeaders={false}
    />
  );
};

export default WorkflowList;
