'use client';

import { useCallback } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches } from '@/hooks/useRepositoryBranches';
import { useRepositoryCommits } from '@/hooks/useRepositoryCommits';
import { useRepositoryTags } from '@/hooks/useRepositoryTags';

import CreateTagModalContent from './tags/CreateTagModalContent';
import TagList from './tags/TagList';

/**
 * Section to display the tags of a repository.
 */
export default function RepositoryTagsSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { repository, currentRef, viewRef } = useRepositoryContext();
  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);
  const { commitsQuery } = useRepositoryCommits(repository.slug);
  const { repositoryTagsQuery, createTagMutation, deleteTagMutation } =
    useRepositoryTags(repository.slug);

  /**
   * Show the create tag modal.
   */
  const showCreateTagModal = useCallback(() => {
    if (
      !currentRef ||
      !repositoryBranchesQuery.data?.data ||
      !commitsQuery.data?.data
    )
      return;
    let createForRef = currentRef;
    // Check if the current ref is a branch
    if (
      repositoryBranchesQuery.data?.data.find(
        (branch) => branch.name === currentRef
      )
    ) {
      // Get the current HEAD commit of the branch
      createForRef = commitsQuery.data?.data[0]?.hash;
    }
    // Show the create tag modal
    irminModal.show(
      dict.repository.tags.createTag,
      <CreateTagModalContent
        currentRef={createForRef}
        createTag={async (tagName: string, ref: string) => {
          await createTagMutation.mutateAsync({
            name: tagName,
            ref,
          });
          irminModal.close();
        }}
      />
    );
  }, [
    currentRef,
    repositoryBranchesQuery,
    commitsQuery,
    irminModal,
    dict,
    createTagMutation,
  ]);

  /**
   * Confirm the deletion of a tag and delete it.
   * @param tag - The ID of the tag to delete
   */
  const handleDeleteTag = useCallback(
    async (tag: string) => {
      const confirmed = await irminConfirm(
        'warning',
        dict.repository.tags.confirmDeleteTag
      );
      if (!confirmed) return;
      // Delete the tag
      await deleteTagMutation.mutateAsync(tag);
    },
    [irminConfirm, dict, deleteTagMutation]
  );

  return (
    <div className='relative container mx-auto max-w-7xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-end gap-4'>
        <Button
          variant='default'
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
        tags={repositoryTagsQuery.data?.data ?? []}
        handleViewRef={(ref: string) => viewRef(ref)}
        handleDeleteTag={handleDeleteTag}
        loading={repositoryTagsQuery.isLoading}
      />
    </div>
  );
}
