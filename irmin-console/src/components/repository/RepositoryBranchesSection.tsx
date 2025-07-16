'use client';

import { useCallback, useMemo } from 'react';

import { IoAdd } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import BranchList from './branches/BranchList';
import CreateBranchModalContent from './branches/CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 */
export default function RepositoryBranchesSection() {
  return (
    <SafeComponent
      level='section'
      title='Repository Branches Error'
      description='The repository branches section encountered an error. Please try refreshing the page.'
    >
      <RepositoryBranchesSectionContent />
    </SafeComponent>
  );
}

function RepositoryBranchesSectionContent() {
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
    () => isResourceAllowed('repository_branch', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canCreateBranch = useMemo(
    () =>
      isResourceAllowed('repository_branch', 'update', repository.id) &&
      isResourceAllowed('repository_branch', 'create', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canDeleteBranch = useMemo(
    () => isResourceAllowed('repository_branch', 'delete', repository.id),
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
      <div
        className={`
          w-full rounded-lg border border-gray-200 bg-card px-2 py-8
          dark:border-gray-800
        `}
      >
        <p
          className={`
            mx-auto mb-2 max-w-lg text-center text-lg text-card-foreground
            lg:text-2xl
          `}
        >
          {dict.common.insufficientPermissions}
        </p>
      </div>
    );
  }

  if (repositoryBranchesQuery.error) {
    return (
      <div
        className={`
          relative container mx-auto max-w-7xl px-2
          md:px-4
        `}
      >
        <QueryError
          error={repositoryBranchesQuery.error}
          onRetry={() => repositoryBranchesQuery.refetch()}
          title={dict.common.somethingWentWrong}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        relative container mx-auto max-w-7xl px-2
        md:px-4
      `}
    >
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
        emptyStateAction={
          canCreateBranch
            ? {
                label: dict.repository.branches.createBranch,
                onClick: showCreateBranchModal,
                variant: 'default',
              }
            : undefined
        }
      />
    </div>
  );
}
