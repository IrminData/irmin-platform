'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoGitMerge } from 'react-icons/go';
import { TbArrowLeft, TbRefresh } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/Button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import { Diff } from '@/types/core/Diff';

import BranchSelector from './branches/BranchSelector';
import DiffView from './diff/DiffVIew';
import MergeModalContent from './diff/MergeModalContent';
import NoDiffWarning from './diff/NoDiffWarning';
import ImmutableWarning from './ImmutableWarning';

/**
 * Section to display the diffs between branches of a repository and merge them.
 */
export default function RepositoryCompareSection() {
  const { dict } = useLocale();
  const { irminModal } = usePopup();
  const {
    branches,
    loadingBranches,
    currentRef,
    defaultRef,
    fetchDiff,
    mergeRefs,
    currentRepository,
    fetchCommitsForRef,
  } = useRepository();

  const [baseRef, setBaseRef] = useState<string | undefined>(defaultRef);
  const [compareRef, setCompareRef] = useState<string | undefined>(currentRef);
  const [compareCommit, setCompareCommit] = useState<string | undefined>(
    currentRef
  );

  const [diff, setDiff] = useState<Diff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  const diffFetchedBase = useRef<string | undefined>();
  const diffFetchedCompare = useRef<string | undefined>();

  /**
   * Fetch the diff between the base and compare branches.
   *
   * Use the latest commit on the compare branch if it is a branch.
   */
  const handleFetchDiff = useCallback(async () => {
    if (!baseRef || !compareRef) {
      setDiff(null);
      return;
    }
    setLoadingDiff(true);
    // Find the commit to compare to
    let compareCommit = compareRef;
    const compareBranch = branches?.find((b) => b.name === compareRef);
    if (compareBranch) {
      // Compare is a branch, so find the latest commit on the branch
      const compareCommits = await fetchCommitsForRef(compareRef);
      if (compareCommits && compareCommits.length > 0) {
        // The first commit is the latest
        compareCommit = compareCommits[0].hash;
      }
    }
    // Update the compare commit state
    setCompareCommit(compareCommit);
    // Fetch the diff between the base and compare commit
    const res = await fetchDiff(baseRef, compareCommit);
    if (res) setDiff(res);
    setLoadingDiff(false);
  }, [baseRef, compareRef, branches, fetchDiff, fetchCommitsForRef]);

  /**
   * Check if the refs are valid for merging.
   */
  const canMerge = useMemo(() => {
    // Can't merge if loading
    if (loadingBranches) return false;
    // Can't merge if base or compare ref is not set
    if (!baseRef || !compareRef) return false;
    // Can't merge if base and compare refs are the same
    if (baseRef === compareRef) return false;
    // Otherwise, can merge
    return true;
  }, [loadingBranches, baseRef, compareRef]);

  /**
   * Check if refs can be modified.
   */
  const notImmutable = useMemo(() => {
    // Can't merge if loading
    if (loadingBranches) return false;
    // Can't merge if the current repository is immutable
    if (currentRepository.is_immutable) return false;
    // Can't merge if base ref is not a branch
    const baseBranch = branches?.find((b) => b.name === baseRef);
    if (!baseBranch) return false;
    // Can't merge if base branch is immutable
    if (baseBranch.is_immutable) return false;
    // Otherwise, can merge
    return true;
  }, [loadingBranches, baseRef, branches, currentRepository]);

  /**
   * Merge the comparison in to the base.
   *
   * Use the compare commit hash if possible, otherwise use the compare ref.
   *
   * Shows the merge modal {@link MergeModalContent} to confirm the merge,
   * collect the commit message and merge strategy, and then merge the branches.
   */
  const handleMerge = useCallback(() => {
    if (!baseRef || !compareRef) return;
    // Show the merge modal
    irminModal.show(
      `${dict.repository.compare.merge} ${compareRef} ${dict.repository.compare.into} ${baseRef}`,
      <MergeModalContent
        baseRef={baseRef}
        compareRef={compareCommit ?? compareRef}
        mergeRefs={mergeRefs}
        closeModal={() => {
          // Refetch the diff when modal is closed
          handleFetchDiff();
          irminModal.close();
        }}
      />
    );
  }, [
    baseRef,
    compareRef,
    compareCommit,
    irminModal,
    dict,
    handleFetchDiff,
    mergeRefs,
  ]);

  /**
   * Fetch the diff when the base or compare branches change.
   */
  useEffect(() => {
    if (
      baseRef === diffFetchedBase.current &&
      compareRef === diffFetchedCompare.current
    )
      return;
    diffFetchedBase.current = baseRef;
    diffFetchedCompare.current = compareRef;
    handleFetchDiff();
  }, [handleFetchDiff, baseRef, compareRef]);

  if (loadingBranches)
    return (
      <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  return (
    <div className='container relative mx-auto flex max-w-6xl flex-col gap-4 px-2 pb-12 pt-4 md:px-4'>
      <div className='flex w-full flex-wrap items-center justify-between gap-4 lg:flex-row'>
        {/* Select branches being compared */}
        <div className='flex w-max flex-wrap items-center justify-start gap-4 lg:flex-row lg:gap-2'>
          <div className='min-w-60'>
            <BranchSelector
              branches={branches ?? []}
              label={dict.repository.compare.baseBranch}
              currentRef={baseRef}
              onSelect={(branch) => {
                setBaseRef(branch.value);
              }}
            />
          </div>
          <ButtonWithTooltip
            size='icon'
            variant='ghost'
            icon={<TbArrowLeft size={18} />}
            onClick={() => {
              setBaseRef(compareRef);
              setCompareRef(baseRef);
            }}
            tooltip={dict.repository.compare.switchDirection}
          />
          <div className='min-w-60'>
            <BranchSelector
              branches={branches ?? []}
              label={dict.repository.compare.compareBranch}
              currentRef={compareRef}
              onSelect={(branch) => {
                setCompareRef(branch.value);
              }}
            />
          </div>
        </div>
        {/* Actions */}
        <div className='flex w-max min-w-48 flex-row items-center gap-4 lg:justify-end'>
          <ButtonWithTooltip
            size='icon'
            variant='secondary'
            icon={<TbRefresh size={18} />}
            onClick={handleFetchDiff}
            tooltip={dict.misc.refresh}
            disabled={loadingDiff}
          />
          <Button
            className='w-full max-w-28'
            variant='default'
            size='sm'
            icon={<GoGitMerge size={18} />}
            onClick={() => {
              handleMerge();
            }}
            disabled={!canMerge || !notImmutable}
          >
            {dict.repository.compare.merge}
          </Button>
        </div>
      </div>
      {loadingDiff && <LoadingSkeleton className='h-96' />}
      {!loadingDiff && !notImmutable && <ImmutableWarning />}
      {!loadingDiff && !canMerge && <NoDiffWarning />}
      {!loadingDiff && canMerge && notImmutable && diff && (
        <DiffView diff={diff} baseRef={baseRef} compareRef={compareRef} />
      )}
    </div>
  );
}
