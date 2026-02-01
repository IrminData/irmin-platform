'use client';

import { useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import NormalList from '@/components/ui/list/NormalList';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRepositoryBranches } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Commit } from '@/types/core/Commit';
import type { GridRow } from '@/types/internal/ListProps';

/**
 * Component to display a list of commits
 *
 * @param props - The props
 * @param props.commits - The list of commits to display
 * @param props.loading - Whether the commits are loading
 */
export default function CommitList({
  commits,
  loading,
}: {
  commits: Commit[];
  loading?: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const router = useRouter();
  const { isResourceAllowed } = useResourceAllowed();

  const { viewRef, repository, currentRef, immutable } = useRepositoryContext();
  const { workspaceSlug } = useWorkspaceContext();
  const { repositoryBranchesQuery, resetBranchMutation, revertCommitMutation } =
    useRepositoryBranches(repository.slug);

  // Check if currentRef is an actual branch name
  const branches = repositoryBranchesQuery.data?.data;
  const isCurrentRefABranch = useMemo(() => {
    if (!currentRef || !branches) return false;
    return branches.some((b) => b.name === currentRef);
  }, [currentRef, branches]);

  // Check if the current branch is immutable
  const isCurrentBranchImmutable = immutable;

  // Check if user can update branches (needed for reset)
  const canUpdateBranch = useMemo(
    () => isResourceAllowed('repository_branch', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );

  const handleResetBranch = useCallback(
    async (commit: Commit) => {
      if (!currentRef || !isCurrentRefABranch) return;

      const confirmMessage = `${dict.repository.commit.confirmResetBranch}\n\n${dict.repository.commit.resetBranchDescription}`;
      const confirmed = await irminConfirm('warning', confirmMessage);

      if (confirmed) {
        resetBranchMutation.mutate({
          branch: currentRef,
          commitRef: commit.hash,
        });
      }
    },
    [currentRef, isCurrentRefABranch, irminConfirm, dict, resetBranchMutation]
  );

  const handleRevertCommit = useCallback(
    async (commit: Commit) => {
      if (!currentRef || !isCurrentRefABranch) return;

      const confirmMessage = `${dict.repository.commit.confirmRevertCommit}\n\n${dict.repository.commit.revertCommitDescription}`;
      const confirmed = await irminConfirm('warning', confirmMessage);

      if (confirmed) {
        revertCommitMutation.mutate({
          branch: currentRef,
          request: { commit_ref: commit.hash },
        });
      }
    },
    [currentRef, isCurrentRefABranch, irminConfirm, dict, revertCommitMutation]
  );

  const rows: GridRow[] = useMemo(
    () =>
      commits.map((commit) => ({
        columns: [
          <div
            key={`commit-${commit.hash}-message-and-author`}
            className='inline-flex flex-col gap-2'
          >
            <p className='text-sm'>{commit.message}</p>
            <p className='text-xs'>{commit.author}</p>
          </div>,
          <div
            key={`commit-${commit.hash}-hash`}
            className='inline-flex flex-col gap-2'
          >
            <p className='text-xs'>{commit.hash.substring(0, 30)}...</p>
            <p className='text-xs'>
              {new Date(commit.timestamp).toLocaleString(locale ?? 'en')}
            </p>
          </div>,
        ],
        actions: [
          {
            label: dict.common.view,
            primary: true,
            onClick: () => viewRef(commit.hash),
          },
          {
            label: dict.repository.commit.changes,
            primary: false,
            disabled: !commit.previous_hash,
            onClick: () => {
              if (commit.previous_hash) {
                router.push(
                  `/${locale ?? 'en'}/workspace/${workspaceSlug}/repositories/${repository.slug}/compare?base=${commit.previous_hash}&compare=${commit.hash}`
                );
              }
            },
          },
          {
            label: dict.repository.commit.copyHash,
            primary: false,
            onClick: () => {
              navigator.clipboard.writeText(commit.hash);
              irminAlert('success', dict.repository.commit.commitHashCopied);
            },
          },
          // Reset branch action - only shown when viewing a mutable branch (not a tag, commit, or immutable branch)
          ...(isCurrentRefABranch &&
          canUpdateBranch &&
          !isCurrentBranchImmutable
            ? [
                {
                  label: dict.repository.commit.resetBranch,
                  primary: false,
                  onClick: () => handleResetBranch(commit),
                },
              ]
            : []),
          // Revert commit action - creates a new commit that undoes this commit's changes
          ...(isCurrentRefABranch &&
          canUpdateBranch &&
          !isCurrentBranchImmutable
            ? [
                {
                  label: dict.repository.commit.revertCommit,
                  primary: false,
                  onClick: () => handleRevertCommit(commit),
                },
              ]
            : []),
        ],
      })) ?? [],
    [
      dict,
      irminAlert,
      locale,
      viewRef,
      router,
      workspaceSlug,
      repository.slug,
      commits,
      isCurrentRefABranch,
      canUpdateBranch,
      isCurrentBranchImmutable,
      handleResetBranch,
      handleRevertCommit,
    ]
  );

  return (
    <div id='commits-list'>
      <NormalList
        headers={[
          dict.common.description,
          dict.repository.commit.commitHash,
          dict.common.actions,
        ]}
        hideHeaders={false}
        loading={loading}
        rows={rows}
      />
    </div>
  );
}
