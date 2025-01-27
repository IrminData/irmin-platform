'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoGitCommit } from 'react-icons/go';
import { GrRevert } from 'react-icons/gr';
import { TbRefresh } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import { Diff } from '@/types/core/Diff';

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
  const {
    commits,
    currentRef,
    fetchDiff,
    commitChanges,
    revertChanges,
    immutable,
  } = useRepository();

  const [diff, setDiff] = useState<Diff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  const diffFetchedBase = useRef<string | null>(null);
  const diffFetchedCompare = useRef<string | null>(null);

  // Commits are sorted in the context, so the first commit is the latest
  const latestCommit = useMemo(() => commits?.[0], [commits]);

  /**
   * Fetch the diff between the base and compare branches.
   */
  const handleFetchDiff = useCallback(async () => {
    if (!latestCommit || !currentRef) {
      setDiff(null);
      return;
    }
    setLoadingDiff(true);
    const res = await fetchDiff(latestCommit.hash, currentRef);
    if (res) setDiff(res);
    setLoadingDiff(false);
  }, [latestCommit, currentRef, fetchDiff]);

  /**
   * Show the commit changes modal {@link CommitChangesModalContent}
   */
  const handleCommitChanges = useCallback(() => {
    // Show the merge modal
    irminModal.show(
      `${dict.repository.commit.commitNewChangesTo} ${currentRef}`,
      <CommitChangesModalContent
        commitChanges={commitChanges}
        closeModal={() => {
          // Refetch the diff when modal is closed
          handleFetchDiff();
          irminModal.close();
        }}
      />
    );
  }, [irminModal, dict, currentRef, handleFetchDiff, commitChanges]);

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
    const done = await revertChanges();
    if (done) handleFetchDiff();
  }, [irminConfirm, dict, handleFetchDiff, revertChanges]);

  /**
   * Fetch the diff when the base or compare branches change.
   */
  useEffect(() => {
    if (!latestCommit || !currentRef) return;
    if (
      latestCommit.hash === diffFetchedBase.current &&
      currentRef === diffFetchedCompare.current
    )
      return;
    diffFetchedBase.current = latestCommit?.hash;
    diffFetchedCompare.current = currentRef;
    handleFetchDiff();
  }, [handleFetchDiff, latestCommit, currentRef]);

  /**
   * Make sure there are changes to commit.
   */
  const canCommit = useMemo(
    () => diff?.items && diff?.items.length > 0,
    [diff]
  );

  if (immutable)
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
            onClick={handleFetchDiff}
            tooltip={dict.common.refresh}
            disabled={loadingDiff}
          />
          <ButtonWithTooltip
            size='icon'
            icon={<GrRevert size={18} />}
            onClick={handleRevertChanges}
            disabled={loadingDiff}
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
      {loadingDiff && <LoadingSkeleton className='h-96' />}
      {!loadingDiff && !canCommit && <NoUncommittedChangesWarning />}
      {!loadingDiff && canCommit && diff && (
        <DiffView
          diff={diff}
          hideHeader={true}
          hideCommits={true}
          noDiffWarning={<NoUncommittedChangesWarning />}
        />
      )}
    </div>
  );
}
