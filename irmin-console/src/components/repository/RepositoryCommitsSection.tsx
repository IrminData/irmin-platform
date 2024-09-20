'use client';

import { useMemo } from 'react';

import NormalList from '@/components/common/list/NormalList';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';

import { GridRow } from '@/types/internal/ListProps';

/**
 * Section to display the commits of a repository on the selected branch.
 */
export default function RepositoryCommitsSection() {
  const { dict, locale } = useLocale();
  const { commitsResults, loadingCommits } = useData();

  const rows: GridRow[] = useMemo(() => {
    if (!commitsResults) return [];
    return (
      commitsResults.data.commits.map((commit, i) => {
        return {
          columns: [
            <div
              key={`commit-${i}-name`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-base'>{commit.message}</p>
              <p className='text-xs'>{commit.description}</p>
            </div>,
            <div
              key={`commit-${i}-hash`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-xs'>{commit.hash}</p>
              <p className='text-xs'>
                {new Date(commit.timestamp).toLocaleString(locale ?? 'en')}
              </p>
            </div>,
            <div
              key={`commit-${i}-owner-and-date`}
              className='inline-flex flex-col gap-2'
            >
              <p className='text-base'>{commit.author}</p>
            </div>,
          ],
        };
      }) ?? []
    );
  }, [commitsResults, locale]);

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
          {dict.repository.tabs.commits}
        </h2>
      </div>
      <NormalList
        headers={[dict.list.name, dict.repository.commitHash, dict.list.author]}
        hideHeaders={false}
        noActions={true}
        loading={loadingCommits}
        rows={rows}
      />
    </div>
  );
}
