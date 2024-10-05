'use client';

import { useCallback, useRef, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { GoChevronDown, GoChevronUp } from 'react-icons/go';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { ChangeType, Diff } from '@/types/core/Diff';
import { IrminAPIUnstructuredResponse } from '@/types/core/IrminAPIResponse';

import CommitList from './CommitList';
import ContentDiff from './ContentDiff';
import NoDiffWarning from './NoDiffWarning';

type OpenDiffContentItem = {
  loading: boolean;
  base: IrminAPIUnstructuredResponse;
  compare: IrminAPIUnstructuredResponse;
  diffItem: number;
};

/**
 * Component to display the diff between two refs in a repository
 *
 * @param props
 * @param props.diff - The diff object to display
 */
const DiffView = ({ diff }: { diff: Diff }) => {
  const { locale, dict } = useLocale();
  const { irminAlert } = usePopup();

  const [openItem, setOpenItem] = useState<OpenDiffContentItem | undefined>(
    undefined
  );

  const fetchingDiffContent = useRef(false);

  /**
   * Fetch the content of the diff for a specific collection
   *
   * @param props - The parameters to fetch the diff content
   * @param props.collection - The collection ID
   * @param props.repository - The repository slug
   * @param props.baseRef - The base ref
   * @param props.compareRef - The compared ref
   */
  const fetchDiffContent = useCallback(
    async ({
      collection,
      repository,
      baseRef,
      compareRef,
    }: {
      collection: string;
      repository: string;
      baseRef: string;
      compareRef: string;
    }) => {
      const { collectionService } = new IrminCore(locale);
      const [baseContent, compareContent] = await Promise.all([
        collectionService.fetchContent({
          collection: collection,
          repository: repository,
          ref: baseRef,
        }),
        collectionService.fetchContent({
          collection: collection,
          repository: repository,
          ref: compareRef,
        }),
      ]);
      return {
        base: baseContent,
        compare: compareContent,
      };
    },
    [locale]
  );

  /**
   * Toggle the visibility of the diff content for a specific item
   *
   * @param index - The index of the item to toggle
   * @returns void
   */
  const toggleItem = useCallback(
    async (index: number) => {
      if (openItem && openItem.diffItem === index) {
        setOpenItem(undefined);
        return;
      }
      if (fetchingDiffContent.current) return;
      try {
        const item = diff.items[index];
        if (!item.collection) return;

        fetchingDiffContent.current = true;
        setOpenItem({
          loading: true,
          diffItem: index,
          base: null,
          compare: null,
        });

        const { base, compare } = await fetchDiffContent({
          collection: item.collection.id,
          repository: diff.repository,
          baseRef: diff.base_ref,
          compareRef: diff.compare_ref,
        });

        setOpenItem({
          loading: false,
          base: base,
          compare: compare,
          diffItem: index,
        });
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.repository.compare.failedToFetchDiffContent
        );
      } finally {
        fetchingDiffContent.current = false;
      }
    },
    [diff, fetchDiffContent, irminAlert, openItem, dict]
  );

  return (
    <div className='w-full'>
      {/* Header Section */}
      <div className='mb-4'>
        <h3 className='text-sm text-gray-900 lg:text-base dark:text-gray-100'>
          {dict.repository.compare.comparing}{' '}
          <span className='font-semibold text-irmin_blue dark:text-irmin_green'>
            {diff.base_ref}
          </span>{' '}
          {dict.repository.compare.and}{' '}
          <span className='font-semibold text-irmin_blue dark:text-irmin_green'>
            {diff.compare_ref}
          </span>
        </h3>
        <p className='text-xs text-gray-600 dark:text-gray-300'>
          {diff.repository}
        </p>
      </div>

      {/* Diff Items Section */}
      <div className='space-y-4'>
        {diff.items.map((item, index) => {
          if (!item.collection) return null;
          return (
            <div
              key={`diff-item-${index}`}
              className='rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-irmin_black'
            >
              {/* Main Diff Item Row */}
              <div className='flex flex-row items-center justify-between gap-4 p-2'>
                <div className='flex flex-row items-center gap-2'>
                  {/* Affected collection */}
                  <h4 className='text-sm text-gray-800 lg:text-base dark:text-gray-200'>
                    {item.collection.name}
                  </h4>
                  {/* Size Indicator */}
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {item.type === ChangeType.ADDED && (
                      <span className='rounded-md bg-green-100 p-1 text-green-700 dark:bg-green-900 dark:text-green-200'>
                        +{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === ChangeType.REMOVED && (
                      <span className='rounded-md bg-red-100 p-1 text-red-700 dark:bg-red-900 dark:text-red-200'>
                        -{item.size} {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === ChangeType.CHANGED && (
                      <span className='rounded-md bg-blue-100 p-1 text-blue-700 dark:bg-blue-900 dark:text-blue-200'>
                        {item.size} {dict.repository.compare.bytes}{' '}
                        {dict.repository.compare.modified}
                      </span>
                    )}
                    {item.type === ChangeType.MOVED && (
                      <span className='rounded-md bg-purple-100 p-1 text-purple-700 dark:bg-purple-900 dark:text-purple-200'>
                        {dict.repository.compare.moved} {item.size}{' '}
                        {dict.repository.compare.bytes}
                      </span>
                    )}
                    {item.type === ChangeType.CONFLICT && (
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
                  colorScheme='gray'
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
      {diff.commits.length > 0 && (
        <div className='mt-4'>
          <CommitList commits={diff.commits} />
        </div>
      )}

      {/* No changes message */}
      {diff.items.length === 0 && <NoDiffWarning />}
    </div>
  );
};

export default DiffView;
