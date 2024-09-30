'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { GoGitMerge } from 'react-icons/go';
import { TbArrowLeft, TbRefresh } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Diff } from '@/types/core/Diff';

import BranchSelector from './BranchSelector';
import DiffView from './DiffVIew';
import MergeModalContent from './MergeModalContent';
import NoDiffWarning from './NoDiffWarning';

/**
 * Section to display the diffs between branches of a repository and merge them.
 */
export default function RepositoryCompareSection() {
  const { dict, locale } = useLocale();
  const { irminAlert, irminModal } = usePopup();
  const {
    branches,
    loadingBranches,
    currentRef,
    currentRepository,
    defaultBranch,
  } = useData();

  const [baseRef, setBaseRef] = useState<string | undefined>(defaultBranch);
  const [compareRef, setCompareRef] = useState<string | undefined>(currentRef);

  const [diff, setDiff] = useState<Diff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  const diffFetchedBase = useRef<string | undefined>();
  const diffFetchedCompare = useRef<string | undefined>();

  /**
   * Fetch the diff between the base and compare branches.
   */
  const fetchDiff = useCallback(async () => {
    try {
      if (!currentRepository || !baseRef || !compareRef) {
        setDiff(null);
        return;
      }
      setLoadingDiff(true);
      const { compareService } = new IrminCore(locale);
      const response = await compareService.compareRefs(
        currentRepository,
        baseRef,
        compareRef
      );
      setDiff(response.data);
    } catch (error) {
      console.error(error);
      irminAlert(
        'error',
        (error as Error)?.message ?? dict.repository.compare.failedToFetchDiff
      );
    } finally {
      setLoadingDiff(false);
    }
  }, [currentRepository, baseRef, compareRef, irminAlert, locale, dict]);

  /**
   * Check if the branches can be merged.
   */
  const canMerge = useMemo(
    () => !loadingBranches && baseRef !== compareRef && baseRef && compareRef,
    [loadingBranches, baseRef, compareRef]
  );

  /**
   * Merge the comparison in to the base.
   *
   * Shows the merge modal {@link MergeModalContent} to confirm the merge,
   * collect the commit message and merge strategy, and then merge the branches.
   */
  const handleMerge = useCallback(() => {
    if (!currentRepository || !baseRef || !compareRef) return;
    if (!canMerge) return;
    // Show the merge modal
    irminModal.show(
      `${dict.repository.compare.merge} ${compareRef} ${dict.repository.compare.into} ${baseRef}`,
      <MergeModalContent
        repository={currentRepository}
        baseRef={baseRef}
        compareRef={compareRef}
        closeModal={() => {
          // Refetch the diff when modal is closed
          fetchDiff();
          irminModal.close();
        }}
      />
    );
  }, [
    irminModal,
    compareRef,
    baseRef,
    dict,
    currentRepository,
    canMerge,
    fetchDiff,
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
    fetchDiff();
  }, [fetchDiff, baseRef, compareRef]);

  if (loadingBranches)
    return (
      <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  return (
    <div className='container relative mx-auto max-w-6xl px-2 pb-12 pt-4 md:px-4'>
      <div className='mb-8 flex w-full flex-wrap items-center justify-between gap-4 lg:flex-row'>
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
          <Button
            variant='icon'
            colorScheme='light'
            size='sm'
            icon={<TbArrowLeft size={12} />}
            onClick={() => {
              setBaseRef(compareRef);
              setCompareRef(baseRef);
            }}
            enableTooltip={true}
          >
            {dict.repository.compare.switchDirection}
          </Button>
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
        {/* Merge branches */}
        <div className='flex w-max min-w-48 flex-row items-center gap-4 lg:justify-end'>
          <Button
            variant='icon'
            colorScheme='light'
            size='sm'
            icon={<TbRefresh size={18} />}
            onClick={fetchDiff}
            enableTooltip={true}
            disabled={loadingDiff}
          >
            {dict.misc.refresh}
          </Button>
          <Button
            className='w-full max-w-28'
            variant='solid'
            colorScheme='primary'
            size='sm'
            icon={<GoGitMerge size={18} />}
            onClick={() => {
              handleMerge();
            }}
            disabled={!canMerge}
          >
            {dict.repository.compare.merge}
          </Button>
        </div>
      </div>
      {loadingDiff && <LoadingSkeleton className='h-96' />}
      {!loadingDiff && !canMerge && <NoDiffWarning />}
      {!loadingDiff && canMerge && diff && <DiffView diff={diff} />}
    </div>
  );
}
