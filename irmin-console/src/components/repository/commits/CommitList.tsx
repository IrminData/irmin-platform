'use client';

import { useMemo } from 'react';

import NormalList from '@/components/ui/list/NormalList';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import type { Commit } from '@/types/core/Commit';
import type { GridRow } from '@/types/internal/ListProps';

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
  commits: Commit[];
  loading?: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();

  const { viewRef } = useRepositoryContext();

  const rows: GridRow[] = useMemo(
    () =>
      commits.map((commit) => ({
        columns: [
          <div
            key={`commit-${commit.hash}-message-and-author`}
            className='inline-flex flex-col gap-2'
          >
            <p className='text-sm'>{commit.message}</p>
            <p className='text-xs'>{commit.author}</p>
          </div>,
          <div
            key={`commit-${commit.hash}-hash`}
            className='inline-flex flex-col gap-2'
          >
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
            onClick: () => viewRef(commit.hash),
          },
          {
            label: dict.repository.commit.copyHash,
            primary: false,
            onClick: () => {
              navigator.clipboard.writeText(commit.hash);
              irminAlert('success', dict.repository.commit.commitHashCopied);
            },
          },
        ],
      })) ?? [],
    [dict, irminAlert, locale, viewRef, commits]
  );

  return (
    <div id='commits-list'>
      <NormalList
        headers={[
          dict.common.description,
          dict.repository.commit.commitHash,
          dict.list.actions,
        ]}
        hideHeaders={false}
        loading={loading}
        rows={rows}
      />
    </div>
  );
}
