'use client';

import { useCallback, useMemo } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches } from '@/hooks/useRepositoryBranches';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

import BranchList from './branches/BranchList';
import CreateBranchModalContent from './branches/CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 */
export default function RepositoryBranchesSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { repository, currentRef, viewRef } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();

  const {
    repositoryBranchesQuery,
    createBranchMutation,
    deleteBranchMutation,
  } = useRepositoryBranches(repository.slug);

  const canViewBranches = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryBranch,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  const canCreateBranch = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryBranch,
        PolicyAction.Update,
        repository.id
      ) &&
      isResourceAllowed(
        PolicyResource.RepositoryBranch,
        PolicyAction.Create,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  const canDeleteBranch = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryBranch,
        PolicyAction.Delete,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  /**
   * Show the create branch modal.
   */
  const showCreateBranchModal = useCallback(() => {
    if (!repositoryBranchesQuery.data?.data) return;
    irminModal.show(
      dict.repository.branches.createBranch,
      <CreateBranchModalContent
        branches={
          repositoryBranchesQuery.data.data.map((branch) => branch.name) ?? []
        }
        createBranch={async (branchName: string, fromBranch: string) => {
          await createBranchMutation.mutateAsync({
            name: branchName,
            from: fromBranch,
          });
          irminModal.close();
        }}
      />
    );
  }, [
    repositoryBranchesQuery.data?.data,
    irminModal,
    dict,
    createBranchMutation,
  ]);

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
      await deleteBranchMutation.mutateAsync(branch);
    },
    [irminConfirm, dict, deleteBranchMutation]
  );

  if (!canViewBranches) {
    return (
      <div className='bg-card w-full rounded-lg border border-gray-200 px-2 py-8 dark:border-gray-800'>
        <p className='text-card-foreground mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
          {dict.common.insufficientPermissions}
        </p>
      </div>
    );
  }

  return (
    <div className='relative container mx-auto max-w-7xl px-2 md:px-4'>
      {canCreateBranch && (
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
      )}
      <BranchList
        currentRef={currentRef}
        branches={repositoryBranchesQuery.data?.data ?? []}
        handleViewBranch={(branch) => viewRef(branch)}
        handleDeleteBranch={canDeleteBranch ? handleDeleteBranch : undefined}
        loading={repositoryBranchesQuery.isLoading}
        immutable={repository.is_immutable}
      />
    </div>
  );
}
