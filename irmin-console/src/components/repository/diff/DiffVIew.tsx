'use client';

import { type JSX, useCallback, useRef, useState } from 'react';

import { GoChevronDown, GoChevronUp } from 'react-icons/go';

import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import { Diff } from '@/types/core/Diff';
import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

import CommitList from '../commits/CommitList';
import ContentDiff from './ContentDiff';
import NoDiffWarning from './NoDiffWarning';

type OpenDiffContentItem = {
  loading: boolean;
  base: IrminAPIBinaryResponse;
  compare: IrminAPIBinaryResponse;
  diffItem: number;
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
  const { fetchDiffContent } = useRepository();

  const [openItem, setOpenItem] = useState<OpenDiffContentItem | undefined>(
    undefined
  );

  const fetchingDiffContent = useRef(false);

  /**
   * Toggle the visibility of the diff content for a specific item
   *
   * @param index - The index of the item to toggle
   */
  const toggleItem = useCallback(
    async (index: number) => {
      if (openItem && openItem.diffItem === index) {
        setOpenItem(undefined);
        return;
      }
      if (fetchingDiffContent.current) return;

      const item = diff.items[index];
      if (!item.object) return;

      fetchingDiffContent.current = true;
      setOpenItem({
        loading: true,
        diffItem: index,
        base: null,
        compare: null,
      });

      const content = await fetchDiffContent(
        item.object.path,
        diff.base_ref,
        diff.compare_ref
      );
      setOpenItem({
        loading: false,
        base: content?.base ?? null,
        compare: content?.compare ?? null,
        diffItem: index,
      });
      fetchingDiffContent.current = false;
    },
    [diff, fetchDiffContent, openItem]
  );

  return (
    <div className='w-full'>
      {/* Header Section */}
      {!hideHeader && (
        <div className='mb-4'>
          <h3 className='text-sm text-gray-900 lg:text-base dark:text-gray-100'>
            {dict.repository.compare.comparing}{' '}
            <span className='text-irmin_blue dark:text-irmin_green font-semibold'>
              {baseRef ?? diff.base_ref}
            </span>{' '}
            {dict.repository.compare.and}{' '}
            <span className='text-irmin_blue dark:text-irmin_green font-semibold'>
              {compareRef ?? diff.compare_ref}
            </span>
          </h3>
          <p className='text-xs text-gray-600 dark:text-gray-300'>
            {diff.repository}
          </p>
        </div>
      )}
      {/* Diff Items Section */}
      <div className='space-y-4'>
        {diff.items.map((item, index) => {
          if (!item.object) return null;
          return (
            <div
              key={`diff-item-${index}`}
              className='bg-card text-card-foreground rounded-lg border border-gray-200 dark:border-gray-800'
            >
              {/* Main Diff Item Row */}
              <div className='flex flex-row items-center justify-between gap-4 p-2'>
                <div className='flex flex-row items-center gap-2'>
                  {/* Affected object */}
                  <h4 className='text-sm text-gray-800 lg:text-base dark:text-gray-200'>
                    {item.object.path}
                  </h4>
                  {/* Size Indicator */}
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {item.type === 'added' && (
                      <span className='rounded-md bg-green-100 p-1 text-green-700 dark:bg-green-900 dark:text-green-200'>
                        +{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'removed' && (
                      <span className='rounded-md bg-red-100 p-1 text-red-700 dark:bg-red-900 dark:text-red-200'>
                        -{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'changed' && (
                      <span className='rounded-md bg-blue-100 p-1 text-blue-700 dark:bg-blue-900 dark:text-blue-200'>
                        {item.size} {dict.repository.compare.bytes}{' '}
                        {dict.repository.compare.modified}
                      </span>
                    )}
                    {item.type === 'moved' && (
                      <span className='rounded-md bg-purple-100 p-1 text-purple-700 dark:bg-purple-900 dark:text-purple-200'>
                        {dict.repository.compare.moved} {item.size}{' '}
                        {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === 'conflict' && (
                      <span className='rounded-md bg-yellow-100 p-1 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'>
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
                  onClick={() => toggleItem(index)}
                  icon={
                    openItem?.diffItem === index ? (
                      <GoChevronUp size={16} />
                    ) : (
                      <GoChevronDown size={16} />
                    )
                  }
                >
                  {openItem?.diffItem === index
                    ? dict.repository.compare.hideChanges
                    : dict.repository.compare.fetchChanges}
                </Button>
              </div>

              {/* Expanded changes section, showing the difference in the content */}
              {openItem?.diffItem === index && !openItem.loading && (
                <div className='border-t dark:border-gray-800'>
                  <ContentDiff
                    item={item}
                    baseContent={openItem.base}
                    compareContent={openItem.compare}
                  />
                </div>
              )}
              {openItem?.diffItem === index && openItem.loading && (
                <div className='border-t dark:border-gray-800'>
                  <LoadingSkeleton className='h-96' />
                </div>
              )}
            </div>
          );
        })}
      </div>

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
