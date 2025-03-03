'use client';

import { useMemo } from 'react';

import NormalList from '@/components/ui/list/NormalList';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Tag } from '@/types/core/Tag';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Component to display a list of tags
 *
 * @param props - The props
 * @param props.currentRef - (optional) The current ref
 * @param props.tags - The list of tags to display
 * @param props.handleViewRef - The function to handle the viewing of a tag
 * @param props.handleDeleteTag - The function to handle the deletion of a tag
 * @param props.loading - Whether the tags are loading
 */
export default function TagList({
  currentRef,
  tags,
  handleViewRef,
  handleDeleteTag,
  loading,
}: {
  currentRef?: string;
  tags: Tag[];
  handleViewRef: (ref: string) => void;
  handleDeleteTag: (tag: string) => void;
  loading: boolean;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const rows: GridRow[] = useMemo(
    () =>
      tags.map((tag, i) => ({
        columns: [
          <div
            key={`tag-${i}-name`}
            className='inline-flex flex-row items-center gap-2'
          >
            <p className='text-base'>{tag.name}</p>
            {tag.name === currentRef && (
              <span className='text-foreground h-max rounded-lg bg-gray-300 px-1 text-xs leading-4 dark:bg-gray-600'>
                {dict.repository.tags.currentlyViewing}
              </span>
            )}
          </div>,
          <p key={`tag-${i}-ref`} className='text-xs'>
            {tag.ref.substring(0, 30)}...
          </p>,
        ],
        actions: [
          {
            label: dict.list.view,
            primary: true,
            onClick: () => {
              handleViewRef(tag.ref);
            },
          },
          {
            label: dict.repository.commit.copyHash,
            primary: false,
            onClick: () => {
              navigator.clipboard.writeText(tag.ref);
              irminAlert('success', dict.repository.commit.commitHashCopied);
            },
          },
          {
            label: dict.list.delete,
            primary: false,
            onClick: () => {
              handleDeleteTag(tag.name);
            },
          },
        ],
      })),
    [tags, currentRef, dict, irminAlert, handleDeleteTag, handleViewRef]
  );

  return (
    <div id='tags-list'>
      <NormalList
        headers={[
          dict.common.name,
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
