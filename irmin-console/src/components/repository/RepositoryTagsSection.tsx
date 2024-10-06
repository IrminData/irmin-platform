'use client';

import { useCallback } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import CreateTagModalContent from './tags/CreateTagModalContent';
import TagList from './tags/TagList';

/**
 * Section to display the tags of a repository.
 */
export default function RepositoryTagsSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const {
    tags,
    loadingTags,
    currentRef,
    commits,
    branches,
    createTag,
    deleteTag,
    viewRef,
  } = useRepository();

  /**
   * Show the create tag modal.
   */
  const showCreateTagModal = useCallback(() => {
    if (!currentRef || !branches || !commits) return;
    let createForRef = currentRef;
    // Check if the current ref is a branch
    if (branches?.find((branch) => branch.name === currentRef)) {
      // Get the current HEAD commit of the branch
      createForRef = commits[0]?.hash;
    }
    // Show the create tag modal
    irminModal.show(
      dict.repository.tags.createTag,
      <CreateTagModalContent
        currentRef={createForRef}
        createTag={async (tagName: string, ref: string) => {
          await createTag(tagName, ref);
          irminModal.close();
        }}
      />
    );
  }, [currentRef, branches, commits, irminModal, dict, createTag]);

  /**
   * Confirm the deletion of a tag and delete it.
   * @param tag - The tag to delete
   */
  const handleDeleteTag = useCallback(
    async (tag: string) => {
      irminConfirm(
        'warning',
        dict.repository.tags.confirmDeleteTag,
        async (confirmed) => {
          if (!confirmed) return;
          // Delete the tag
          await deleteTag(tag);
        }
      );
    },
    [irminConfirm, dict, deleteTag]
  );

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-end gap-4'>
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          icon={<IoAdd size={18} />}
          onClick={() => {
            showCreateTagModal();
          }}
        >
          {dict.repository.tags.createTag}
        </Button>
      </div>
      <TagList
        currentRef={currentRef}
        tags={tags ?? []}
        handleViewRef={(ref: string) => viewRef(ref)}
        handleDeleteTag={handleDeleteTag}
        loading={loadingTags}
      />
    </div>
  );
}
