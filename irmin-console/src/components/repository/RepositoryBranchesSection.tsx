'use client';

import { useCallback } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import BranchList from './branches/BranchList';
import CreateBranchModalContent from './branches/CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 */
export default function RepositoryBranchesSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const {
    branches,
    loadingBranches,
    currentRef,
    createBranch,
    deleteBranch,
    viewRef,
    currentRepository,
  } = useRepository();

  /**
   * Show the create branch modal.
   */
  const showCreateBranchModal = useCallback(() => {
    if (!branches) return;
    irminModal.show(
      dict.repository.branches.createBranch,
      <CreateBranchModalContent
        branches={branches.map((branch) => branch.name) ?? []}
        createBranch={async (branchName: string, fromBranch: string) => {
          await createBranch(branchName, fromBranch);
          irminModal.close();
        }}
      />
    );
  }, [branches, irminModal, dict, createBranch]);

  /**
   * Confirm the deletion of a branch and delete it.
   *
   * @param branch - The branch to delete
   */
  const handleDeleteBranch = useCallback(
    async (branch: string) => {
      const confirmed = await irminConfirm(
        'warning',
        dict.repository.branches.confirmDeleteBranch
      );
      if (!confirmed) return;
      // Delete the branch
      await deleteBranch(branch);
    },
    [irminConfirm, dict, deleteBranch]
  );

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-end gap-4'>
        <Button
          variant='default'
          size='sm'
          icon={<IoAdd size={18} />}
          onClick={() => {
            showCreateBranchModal();
          }}
        >
          {dict.repository.branches.createBranch}
        </Button>
      </div>
      <BranchList
        currentRef={currentRef}
        branches={branches ?? []}
        handleViewBranch={(branch) => viewRef(branch)}
        handleDeleteBranch={handleDeleteBranch}
        loading={loadingBranches}
        immutable={currentRepository.is_immutable}
      />
    </div>
  );
}
