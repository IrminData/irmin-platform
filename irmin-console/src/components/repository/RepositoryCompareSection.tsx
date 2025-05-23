'use client';

import { useCallback, useMemo, useState } from 'react';

import { GoGitMerge } from 'react-icons/go';
import { TbArrowLeft, TbRefresh } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches } from '@/hooks/useRepositoryBranches';
import { useRepositoryDiff } from '@/hooks/useRepositoryDiff';

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
  const { repository, currentRef, defaultRef } = useRepositoryContext();
  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);

  const [baseRef, setBaseRef] = useState<string | undefined>(defaultRef);
  const [compareRef, setCompareRef] = useState<string | undefined>(currentRef);

  const { diffQuery, mergeRefsMutation } = useRepositoryDiff(
    repository.slug,
    baseRef,
    compareRef
  );

  /**
   * Check if the refs are valid for merging.
   */
  const canMerge = useMemo(() => {
    // Can't merge if base or compare ref is not set
    if (!baseRef || !compareRef) return false;
    // Can't merge if base and compare refs are the same
    if (baseRef === compareRef) return false;
    // Otherwise, can merge
    return true;
  }, [baseRef, compareRef]);

  /**
   * Check if refs can be modified.
   */
  const notImmutable = useMemo(() => {
    // Can't merge if loading
    if (repositoryBranchesQuery.isLoading) return false;
    // Can't merge if the current repository is immutable
    if (repository.is_immutable) return false;
    // Can't merge if base ref is not a branch
    const baseBranch = repositoryBranchesQuery.data?.data?.find(
      (b) => b.name === baseRef
    );
    if (!baseBranch) return false;
    // Can't merge if base branch is immutable
    if (baseBranch.is_immutable) return false;
    // Otherwise, can merge
    return true;
  }, [
    repositoryBranchesQuery.isLoading,
    baseRef,
    repository,
    repositoryBranchesQuery.data?.data,
  ]);

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
        compareRef={compareRef}
        mergeRefs={async (data) => {
          try {
            await mergeRefsMutation.mutateAsync(data);
            return true;
          } catch (error) {
            console.error(error);
            return false;
          }
        }}
        closeModal={() => {
          // Refetch the diff when modal is closed
          diffQuery.refetch();
          irminModal.close();
        }}
      />
    );
  }, [baseRef, compareRef, irminModal, dict, mergeRefsMutation, diffQuery]);

  return (
    <div className='relative container mx-auto flex max-w-7xl flex-col gap-4 px-2 pt-4 pb-12 md:px-4'>
      <div className='flex w-full flex-wrap items-center justify-between gap-4 lg:flex-row'>
        {/* Select branches being compared */}
        <div className='flex w-max flex-wrap items-center justify-start gap-4 lg:flex-row lg:gap-2'>
          <div className='min-w-60'>
            <BranchSelector
              branches={repositoryBranchesQuery.data?.data ?? []}
              loading={repositoryBranchesQuery.isLoading}
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
              branches={repositoryBranchesQuery.data?.data ?? []}
              loading={repositoryBranchesQuery.isLoading}
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
            onClick={() => {
              diffQuery.refetch();
            }}
            tooltip={dict.common.refresh}
            disabled={diffQuery.isLoading}
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
      {diffQuery.isLoading && <LoadingSkeleton className='h-96' />}
      {!diffQuery.isLoading && !notImmutable && <ImmutableWarning />}
      {!diffQuery.isLoading && !canMerge && <NoDiffWarning />}
      {!diffQuery.isLoading &&
        canMerge &&
        notImmutable &&
        diffQuery.data?.data && (
          <DiffView
            diff={diffQuery.data.data}
            baseRef={baseRef}
            compareRef={compareRef}
          />
        )}
    </div>
  );
}
