'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoGitCommit } from 'react-icons/go';
import { GrRevert } from 'react-icons/gr';
import { TbRefresh } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import { Diff } from '@/types/core/Diff';

import CommitChangesModalContent from './commits/CommitChangesModalContent';
import NoUncommitedChangesWarning from './commits/NoUncommitedChangesWarning';
import DiffView from './diff/DiffVIew';
import ImmutableWarning from './ImmutableWarning';

/**
 * Section to view and commit uncommited changes in a repository.
 */
export default function RepositoryUncommitedChangesSection() {
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

  const diffFetchedBase = useRef<string | undefined>();
  const diffFetchedCompare = useRef<string | undefined>();

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
    irminConfirm(
      'warning',
      dict.repository.commit.confirmRevertChanges,
      async (confirmed) => {
        if (!confirmed) return;
        // Revert the changes, then refetch the diff
        const done = await revertChanges();
        if (done) handleFetchDiff();
      }
    );
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
      <div className='container relative mx-auto max-w-6xl px-2 py-12 pt-4 md:px-4'>
        <ImmutableWarning />
      </div>
    );

  return (
    <div className='container relative mx-auto max-w-6xl px-2 pb-12 pt-4 md:px-4'>
      <div className='mb-8 flex w-full flex-wrap items-center justify-between gap-4 lg:flex-row'>
        {/* Title */}
        <h3 className='text-sm text-gray-900 lg:text-base dark:text-gray-100'>
          {dict.repository.commit.showingUncommitedChangesFor}{' '}
          <span className='font-semibold text-irmin_blue dark:text-irmin_green'>
            {currentRef}
          </span>
        </h3>
        {/* Actions */}
        <div className='flex w-max min-w-48 flex-row items-center gap-4 lg:justify-end'>
          <Button
            variant='icon'
            colorScheme='light'
            size='sm'
            icon={<TbRefresh size={18} />}
            onClick={handleFetchDiff}
            enableTooltip={true}
            disabled={loadingDiff}
          >
            {dict.misc.refresh}
          </Button>
          <Button
            variant='icon'
            colorScheme='light'
            size='sm'
            icon={<GrRevert size={18} />}
            onClick={handleRevertChanges}
            enableTooltip={true}
            disabled={loadingDiff}
          >
            {dict.repository.commit.revertChanges}
          </Button>
          <Button
            variant='solid'
            colorScheme='primary'
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
      {!loadingDiff && !canCommit && <NoUncommitedChangesWarning />}
      {!loadingDiff && canCommit && diff && (
        <DiffView
          diff={diff}
          hideHeader={true}
          hideCommits={true}
          noDiffWarning={<NoUncommitedChangesWarning />}
        />
      )}
    </div>
  );
}
