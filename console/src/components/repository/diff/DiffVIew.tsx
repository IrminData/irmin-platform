'use client';

import { type JSX, useCallback, useState } from 'react';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryDiffContent } from '@/hooks/api';

import type { Diff } from '@/types/core/Diff';

import CommitList from '../commits/CommitList';
import ContentDiff from './ContentDiff';
import NoDiffWarning from './NoDiffWarning';
import SchemaDiffSection from './SchemaDiffSection';

type OpenDiffItem = {
  path: string;
  index: number;
};

/**
 * Component to display the diff between two refs in a repository
 *
 * @param props
 * @param props.diff - The diff object to display
 * @param props.hideHeader - (optional) Whether to hide the header
 * @param props.hideCommits - (optional) Whether to hide the commits
 * @param props.noDiffWarning - (optional) The warning to display when there are no changes
 * @param props.baseRef - (optional) The base ref to compare - used for title
 * @param props.compareRef - (optional) The compare ref to compare - used for title
 */
const DiffView = ({
  diff,
  hideHeader,
  hideCommits,
  noDiffWarning,
  baseRef,
  compareRef,
}: {
  diff: Diff;
  hideHeader?: boolean;
  hideCommits?: boolean;
  noDiffWarning?: JSX.Element;
  baseRef?: string;
  compareRef?: string;
}) => {
  const { dict } = useLocale();
  const { repository } = useRepositoryContext();
  const [openItem, setOpenItem] = useState<OpenDiffItem | null>(null);
  const { diffContentQuery } = useRepositoryDiffContent(
    repository.slug,
    baseRef,
    compareRef,
    openItem?.path
  );

  const toggleItem = useCallback(
    async (item: OpenDiffItem) => {
      if (openItem?.path === item.path) {
        setOpenItem(null);
        return;
      }
      setOpenItem(item);
    },
    [openItem]
  );

  return (
    <div className='w-full'>
      {/* Header Section */}
      {!hideHeader && (
        <div className='mb-4'>
          <h3
            className={`
              text-sm text-foreground
              lg:text-base
            `}
          >
            {dict.repository.compare.comparing}{' '}
            <span
              className={`
                font-semibold text-foreground underline decoration-accent
                underline-offset-4
              `}
            >
              {baseRef ?? diff.base_ref}
            </span>{' '}
            {dict.repository.compare.and}{' '}
            <span
              className={`
                font-semibold text-foreground underline decoration-accent
                underline-offset-4
              `}
            >
              {compareRef ?? diff.compare_ref}
            </span>
          </h3>
          <p className={`text-xs text-muted-foreground`}>{diff.repository}</p>
        </div>
      )}
      {/* Diff Items Section */}
      <div className='space-y-4'>
        {diff.items.map((item, index) => {
          if (!item.object) return null;
          return (
            <div
              key={`diff-item-${item.type}-${item.object.path}`}
              className={`
                rounded-[2px] border border-border bg-card text-card-foreground
              `}
            >
              {/* Main Diff Item Row */}
              <div
                className={`
                  flex flex-row items-center justify-between gap-4 p-2
                `}
              >
                <div className='flex flex-row items-center gap-2'>
                  {/* Affected object */}
                  <h4
                    className={`
                      text-sm text-foreground
                      lg:text-base
                    `}
                  >
                    {item.object.path}
                  </h4>
                  {/* Size Indicator */}
                  <div className={`text-xs text-muted-foreground`}>
                    {item.type === 'added' && (
                      <span
                        className={`
                          rounded-[2px] border border-success/30 bg-success/10
                          p-1 text-foreground
                        `}
                      >
                        +{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'removed' && (
                      <span
                        className={`
                          rounded-[2px] border border-destructive/30
                          bg-destructive/10 p-1 text-foreground
                        `}
                      >
                        -{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'changed' && (
                      <span
                        className={`
                          rounded-[2px] border border-chart-2/30 bg-chart-2/10
                          p-1 text-foreground
                        `}
                      >
                        {item.size} {dict.repository.compare.bytes}{' '}
                        {dict.repository.compare.modified}
                      </span>
                    )}
                    {item.type === 'moved' && (
                      <span
                        className={`
                          rounded-[2px] border border-chart-4/30 bg-chart-4/10
                          p-1 text-foreground
                        `}
                      >
                        {dict.repository.compare.moved} {item.size}{' '}
                        {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'conflict' && (
                      <span
                        className={`
                          rounded-[2px] border border-warning/30 bg-warning/10
                          p-1 text-foreground
                        `}
                      >
                        {dict.repository.compare.conflict} {item.size}{' '}
                        {dict.repository.compare.bytes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle Button */}
                <Button
                  variant='link'
                  size='sm'
                  onClick={() => toggleItem({ path: item.object.path, index })}
                  icon={
                    openItem?.path === item.object.path ? (
                      <TbChevronUp size={16} />
                    ) : (
                      <TbChevronDown size={16} />
                    )
                  }
                >
                  {openItem?.path === item.object.path
                    ? dict.repository.compare.hideChanges
                    : dict.repository.compare.fetchChanges}
                </Button>
              </div>

              {/* Expanded changes section, showing the difference in the content */}
              {openItem?.path === item.object.path &&
                !diffContentQuery.isLoading &&
                diffContentQuery.data && (
                  <div className={`border-t border-border`}>
                    {diffContentQuery.data.baseError ||
                    diffContentQuery.data.compareError ? (
                      <div
                        className={`
                          px-4 py-8 text-center text-sm text-muted-foreground
                        `}
                      >
                        {diffContentQuery.data.baseError && (
                          <p>{diffContentQuery.data.baseError}</p>
                        )}
                        {diffContentQuery.data.compareError && (
                          <p>{diffContentQuery.data.compareError}</p>
                        )}
                      </div>
                    ) : (
                      <ContentDiff
                        item={item}
                        baseContent={diffContentQuery.data?.base}
                        compareContent={diffContentQuery.data?.compare}
                      />
                    )}
                  </div>
                )}
              {openItem?.path === item.object.path &&
                diffContentQuery.isLoading && (
                  <div className={`border-t border-border`}>
                    <LoadingSkeleton className='h-96' />
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Schema Diffs Section */}
      {diff.schema_diffs && diff.schema_diffs.length > 0 && (
        <div className='mt-4'>
          <SchemaDiffSection schemaDiffs={diff.schema_diffs} />
        </div>
      )}

      {/* Diff Commites Section */}
      {diff.commits && diff.commits.length > 0 && !hideCommits && (
        <div className='mt-4'>
          <CommitList commits={diff.commits} />
        </div>
      )}

      {/* No changes message */}
      {diff.items.length === 0 && (noDiffWarning ?? <NoDiffWarning />)}
    </div>
  );
};

export default DiffView;
