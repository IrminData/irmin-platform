'use client';

import { useCallback, useMemo } from 'react';

import { GoGitCommit } from 'react-icons/go';
import { GrRevert } from 'react-icons/gr';
import { TbRefresh } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryUncommittedChanges } from '@/hooks/useRepositoryUncommittedChanges';

import CommitChangesModalContent from './commits/CommitChangesModalContent';
import NoUncommittedChangesWarning from './commits/NoUncommittedChangesWarning';
import DiffView from './diff/DiffVIew';
import ImmutableWarning from './ImmutableWarning';

/**
 * Section to view and commit uncommitted changes in a repository.
 */
export default function RepositoryUncommittedChangesSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { repository, currentRef } = useRepositoryContext();
  const {
    uncommittedChangesQuery,
    commitChangesMutation,
    revertChangesMutation,
  } = useRepositoryUncommittedChanges(repository.slug, currentRef ?? '');

  /**
   * Show the commit changes modal {@link CommitChangesModalContent}
   */
  const handleCommitChanges = useCallback(() => {
    // Show the merge modal
    irminModal.show(
      `${dict.repository.commit.commitNewChangesTo} ${currentRef}`,
      <CommitChangesModalContent
        commitChanges={async (message: string) => {
          try {
            await commitChangesMutation.mutateAsync({
              message,
            });
            return true;
          } catch (error) {
            console.error('Failed to commit changes', error);
            return false;
          }
        }}
        closeModal={irminModal.close}
      />
    );
  }, [irminModal, dict, currentRef, commitChangesMutation]);

  /**
   * Revert the changes in the working branch.
   */
  const handleRevertChanges = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      dict.repository.commit.confirmRevertChanges
    );
    if (!confirmed) return;
    // Revert the changes, then refetch the diff
    await revertChangesMutation.mutateAsync();
  }, [irminConfirm, dict, revertChangesMutation]);

  /**
   * Make sure there are changes to commit.
   */
  const canCommit = useMemo(
    () =>
      uncommittedChangesQuery.data?.data?.items &&
      uncommittedChangesQuery.data?.data?.items.length > 0,
    [uncommittedChangesQuery.data?.data?.items]
  );

  if (repository.is_immutable)
    return (
      <div className='relative container mx-auto max-w-7xl px-2 py-12 pt-4 md:px-4'>
        <ImmutableWarning />
      </div>
    );

  return (
    <div className='relative container mx-auto max-w-7xl px-2 pt-4 pb-12 md:px-4'>
      <div className='mb-8 flex w-full flex-wrap items-center justify-between gap-4 lg:flex-row'>
        {/* Title */}
        <h3 className='text-sm text-gray-900 lg:text-base dark:text-gray-100'>
          {dict.repository.commit.showingUncommittedChangesFor}{' '}
          <span className='text-irmin_blue dark:text-irmin_green font-semibold'>
            {currentRef}
          </span>
        </h3>
        {/* Actions */}
        <div className='flex w-max min-w-48 flex-row items-center gap-4 lg:justify-end'>
          <ButtonWithTooltip
            size='icon'
            icon={<TbRefresh size={18} />}
            onClick={() => uncommittedChangesQuery.refetch()}
            tooltip={dict.common.refresh}
            disabled={uncommittedChangesQuery.isLoading}
          />
          <ButtonWithTooltip
            size='icon'
            icon={<GrRevert size={18} />}
            onClick={handleRevertChanges}
            disabled={uncommittedChangesQuery.isLoading}
            tooltip={dict.repository.commit.revertChanges}
          />
          <Button
            variant='default'
            size='sm'
            icon={<GoGitCommit size={18} />}
            onClick={handleCommitChanges}
            disabled={!canCommit}
          >
            {dict.repository.commit.commitChanges}
          </Button>
        </div>
      </div>
      {uncommittedChangesQuery.isLoading ? (
        <LoadingSkeleton className='h-96' />
      ) : (
        <>
          {canCommit && uncommittedChangesQuery.data?.data?.items ? (
            <DiffView
              diff={uncommittedChangesQuery.data?.data}
              hideHeader={true}
              hideCommits={true}
              noDiffWarning={<NoUncommittedChangesWarning />}
            />
          ) : (
            <NoUncommittedChangesWarning />
          )}
        </>
      )}
    </div>
  );
}
