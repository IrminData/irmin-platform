'use client';

import { useMemo } from 'react';

import NormalList from '@/components/common/list/NormalList';
import PortalTitle from '@/components/portal/PortalTitle';

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
    <div className='container relative mx-auto max-w-6xl'>
      <PortalTitle title={dict.repository.tabs.commits} />
      <NormalList
        headers={[dict.list.name, dict.repository.commitHash, dict.list.owner]}
        hideHeaders={false}
        noActions={true}
        loading={loadingCommits}
        rows={rows}
      />
    </div>
  );
}
