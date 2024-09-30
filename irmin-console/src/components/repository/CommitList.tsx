'use client';

import NormalList from '@/components/common/list/NormalList';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Commit } from '@/types/core/Commit';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Component to display a list of commits
 *
 * @param props - The props
 * @param props.commits - The list of commits to display
 * @param props.loading - Whether the commits are loading
 */
export default function CommitList({
  commits,
  loading,
}: {
  commits?: Commit[];
  loading?: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();

  const rows: GridRow[] =
    commits?.map((commit, i) => ({
      columns: [
        <div
          key={`commit-${i}-message-and-author`}
          className='inline-flex flex-col gap-2'
        >
          <p className='text-sm'>{commit.message}</p>
          <p className='text-xs'>{commit.author}</p>
        </div>,
        <div key={`commit-${i}-hash`} className='inline-flex flex-col gap-2'>
          <p className='text-xs'>{commit.hash.substring(0, 30)}...</p>
          <p className='text-xs'>
            {new Date(commit.timestamp).toLocaleString(locale ?? 'en')}
          </p>
        </div>,
      ],
      actions: [
        {
          label: dict.list.view,
          primary: true,
          href: `./refs/${commit.hash}`,
        },
        {
          label: dict.repository.copyHash,
          primary: false,
          onClick: () => {
            navigator.clipboard.writeText(commit.hash);
            irminAlert('success', dict.repository.commitHashCopied);
          },
        },
      ],
    })) ?? [];

  return (
    <div id='commits-list'>
      <NormalList
        headers={[
          dict.list.description,
          dict.repository.commitHash,
          dict.list.actions,
        ]}
        hideHeaders={false}
        loading={loading}
        rows={rows}
      />
    </div>
  );
}
