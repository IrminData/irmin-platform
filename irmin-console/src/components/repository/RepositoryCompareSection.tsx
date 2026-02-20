'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { GoGitMerge } from 'react-icons/go';
import { TbArrowLeft, TbRefresh } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import SafeComponent from '@/components/ui/error/SafeComponent';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import {
  useRepositoryBranches,
  useRepositoryDiff,
  useRepositoryTags,
} from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import RefSelector from './branches/RefSelector';
import DiffView from './diff/DiffVIew';
import MergeModalContent from './diff/MergeModalContent';
import NoDiffWarning from './diff/NoDiffWarning';
import ImmutableWarning from './ImmutableWarning';

/**
 * Section to display the diffs between branches of a repository and merge them.
 */
export default function RepositoryCompareSection() {
  return (
    <Suspense>
      <RepositoryCompareSectionContent />
    </Suspense>
  );
}

function RepositoryCompareSectionContent() {
  const { dict } = useLocale();
  const { irminModal } = usePopup();
  const { repository, currentRef, defaultRef } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();
  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);
  const { repositoryTagsQuery } = useRepositoryTags(repository.slug);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get refs from query params or defaults
  // Normalize empty strings to null to ensure proper fallback behavior
  const baseFromParams = searchParams.get('base') || null;
  const compareFromParams = searchParams.get('compare') || null;

  // Track URL params to detect navigation changes
  const urlParamsKey = `${baseFromParams ?? ''}|${compareFromParams ?? ''}`;

  // Local state for user interactions, stored with the URL params key when set
  // This allows automatic invalidation when URL params change
  const [localState, setLocalState] = useState<{
    baseRef?: string;
    compareRef?: string;
    urlParamsKey: string;
  }>({ urlParamsKey });

  // Determine which ref to use
  // Local state only takes precedence if URL params haven't changed
  // Priority: local state (if URL matches) > URL params > defaults
  const baseRef =
    localState.urlParamsKey === urlParamsKey && localState.baseRef !== undefined
      ? localState.baseRef
      : (baseFromParams ?? defaultRef);
  const compareRef =
    localState.urlParamsKey === urlParamsKey &&
    localState.compareRef !== undefined
      ? localState.compareRef
      : (compareFromParams ?? currentRef);

  const { diffQuery, mergeRefsMutation } = useRepositoryDiff(
    repository.slug,
    baseRef,
    compareRef
  );

  // Log error details to console for debugging, but don't expose to users
  useEffect(() => {
    if (diffQuery.isError && diffQuery.error) {
      console.error('Diff query error:', diffQuery.error);
    }
  }, [diffQuery.isError, diffQuery.error]);

  /**
   * Clear search params when user interacts with local controls.
   */
  const clearSearchParams = useCallback(() => {
    if (baseFromParams || compareFromParams) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('base');
      params.delete('compare');
      const queryString = params.toString();
      router.replace(
        queryString ? `?${queryString}` : window.location.pathname,
        { scroll: false }
      );
    }
  }, [baseFromParams, compareFromParams, searchParams, router]);

  const canViewDiff = useMemo(
    () => isResourceAllowed('repository_commit', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canMerge = useMemo(() => {
    // Can't merge if base or compare ref is not set
    if (!baseRef || !compareRef) return false;
    // Can't merge if base and compare refs are the same
    if (baseRef === compareRef) return false;
    // Can't merge if user doesn't have permission
    if (
      !isResourceAllowed('repository_branch', 'update', repository.id) ||
      !isResourceAllowed('repository_commit', 'create', repository.id) ||
      !isResourceAllowed('repository_object', 'create', repository.id) ||
      !isResourceAllowed('repository_object', 'update', repository.id) ||
      !isResourceAllowed('repository_object', 'update', repository.id)
    )
      return false;
    // Otherwise, can merge
    return true;
  }, [baseRef, compareRef, isResourceAllowed, repository.id]);

  /**
   * Check if refs can be modified.
   */
  const notImmutable = useMemo(() => {
    // Can't merge if loading branches
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
   * Check if repository or base branch is actually immutable.
   * Used to determine if ImmutableWarning should be shown.
   */
  const isActuallyImmutable = useMemo(() => {
    // Repository is immutable
    if (repository.is_immutable) return true;
    // Check if base ref is an immutable branch
    const baseBranch = repositoryBranchesQuery.data?.data?.find(
      (b) => b.name === baseRef
    );
    if (baseBranch?.is_immutable) return true;
    // Not immutable
    return false;
  }, [repository.is_immutable, repositoryBranchesQuery.data?.data, baseRef]);

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

  if (!canViewDiff) {
    return (
      <SafeComponent
        level='section'
        title='Repository Access Error'
        description='Failed to access repository diff due to permissions'
      >
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
      </SafeComponent>
    );
  }

  return (
    <SafeComponent
      level='section'
      title='Repository Compare Error'
      description='Failed to load repository comparison interface'
    >
      <div
        className={`
          relative container mx-auto flex max-w-7xl flex-col gap-4 px-2 pt-4
          pb-12
          md:px-4
        `}
      >
        <div
          className={`
            flex w-full flex-wrap items-center justify-between gap-4
            lg:flex-row
          `}
        >
          {/* Select branches being compared */}
          <div
            className={`
              flex w-max flex-wrap items-center justify-start gap-4
              lg:flex-row lg:gap-2
            `}
          >
            <div className='min-w-60'>
              <RefSelector
                id='ref-selector-base'
                branches={repositoryBranchesQuery.data?.data ?? []}
                tags={repositoryTagsQuery.data?.data ?? []}
                loading={
                  repositoryBranchesQuery.isLoading ||
                  repositoryTagsQuery.isLoading
                }
                label={dict.repository.compare.baseBranch}
                currentRef={baseRef}
                onSelect={(ref) => {
                  clearSearchParams();
                  setLocalState({
                    baseRef: ref.value,
                    compareRef,
                    urlParamsKey: '|',
                  });
                }}
              />
            </div>
            <ButtonWithTooltip
              size='icon'
              variant='ghost'
              icon={<TbArrowLeft size={18} />}
              onClick={() => {
                clearSearchParams();
                setLocalState({
                  baseRef: compareRef,
                  compareRef: baseRef,
                  urlParamsKey: '|',
                });
              }}
              tooltip={dict.repository.compare.switchDirection}
            />
            <div className='min-w-60'>
              <RefSelector
                id='ref-selector-compare'
                branches={repositoryBranchesQuery.data?.data ?? []}
                tags={repositoryTagsQuery.data?.data ?? []}
                loading={
                  repositoryBranchesQuery.isLoading ||
                  repositoryTagsQuery.isLoading
                }
                label={dict.repository.compare.compareBranch}
                currentRef={compareRef}
                onSelect={(ref) => {
                  clearSearchParams();
                  setLocalState({
                    baseRef,
                    compareRef: ref.value,
                    urlParamsKey: '|',
                  });
                }}
              />
            </div>
          </div>
          {/* Actions */}
          <div
            className={`
              flex w-max min-w-48 flex-row items-center gap-4
              lg:justify-end
            `}
          >
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
        {!diffQuery.isLoading && diffQuery.isError && (
          <div
            className={`
              w-full rounded-lg border border-red-200 bg-red-50 px-4 py-8
              dark:border-red-900 dark:bg-red-950/20
            `}
          >
            <p
              className={`
                mx-auto mb-2 max-w-lg text-center text-lg text-red-700
                lg:text-xl
                dark:text-red-400
              `}
            >
              {dict.repository.compare.failedToLoadDiff}
            </p>
            <p
              className={`
                mx-auto max-w-lg text-center text-sm text-red-600
                dark:text-red-500
              `}
            >
              {dict.repository.compare.failedToLoadDiffSubtitle}
            </p>
          </div>
        )}
        {!diffQuery.isLoading && !diffQuery.isError && diffQuery.data?.data && (
          <>
            {isActuallyImmutable && <ImmutableWarning />}
            <DiffView
              diff={diffQuery.data.data}
              baseRef={baseRef}
              compareRef={compareRef}
            />
          </>
        )}
        {!diffQuery.isLoading &&
          !diffQuery.isError &&
          !diffQuery.data?.data && (
            <>
              {isActuallyImmutable && <ImmutableWarning />}
              {!isActuallyImmutable && <NoDiffWarning />}
            </>
          )}
      </div>
    </SafeComponent>
  );
}
