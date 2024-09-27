'use client';

import { useMemo } from 'react';

import NormalList from '@/components/common/list/NormalList';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { GridRow } from '@/types/internal/ListProps';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { dict, locale } = useLocale();
  const { commits, loadingCommits } = useData();
  const { irminAlert } = usePopup();

  const rows: GridRow[] = useMemo(() => {
    if (!commits) return [];
    return (
      commits.map((commit, i) => {
        return {
          columns: [
            <div
              key={`commit-${i}-message-and-author`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-sm'>{commit.message}</p>
              <p className='text-xs'>{commit.author}</p>
            </div>,
            <div
              key={`commit-${i}-hash`}
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
        };
      }) ?? []
    );
  }, [commits, locale, dict, irminAlert]);

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div id='commits-list'>
        <NormalList
          headers={[
            dict.list.description,
            dict.repository.commitHash,
            dict.list.actions,
          ]}
          hideHeaders={false}
          loading={loadingCommits}
          rows={rows}
        />
      </div>
    </div>
  );
}
