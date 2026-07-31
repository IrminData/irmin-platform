import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateBranchRequest,
  RevertCommitRequest,
} from '@/lib/core/resources/RepositoryBranchService';
import { repositoryBranchesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Branch } from '@/types/core/Branch';
import type { Commit } from '@/types/core/Commit';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

export function useRepositoryBranches(repositorySlug: string) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryBranchesQuery = useQuery<IrminAPIResponse<Branch[]>, Error>({
    queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.repositoryBranchService.fetchBranches({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
    },
  });

  const createBranchMutation = useMutation<
    IrminAPIResponse<Branch>,
    Error,
    CreateBranchRequest
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.repositoryBranchService.createBranch({
        workspace: workspaceSlug,
        repository: repositorySlug,
        request: data,
      });
    },
    ...createMutationHandlers<Branch, CreateBranchRequest>(
      queryClient,
      'repository-branches',
      {
        cacheConfig: {
          primaryQueryKey: repositoryBranchesQueryKey(
            workspaceSlug,
            repositorySlug
          ),
          getItemId: (branch) => branch.name,
          createOptimisticItem: (input, _tempId: string) => ({
            name: input.name,
            from: input.from,
            default: false,
            is_immutable: false,
            commit: {
              hash: 'temp-commit',
              message: 'Loading...',
              author: 'Current User',
              timestamp: new Date().toISOString(),
            },
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Branch created successfully');
        },
        onError: (error) => {
          irminAlert(
            'error',
            error.message ?? dict.common.errors.mutations.createBranchFailed
          );
        },
      }
    ),
  });

  const deleteBranchMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (branch) => {
      const core = await getCore();
      return await core.repositoryBranchService.deleteBranch({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
      });
    },
    ...deleteMutationHandlers<Branch>(queryClient, {
      cacheConfig: {
        primaryQueryKey: repositoryBranchesQueryKey(
          workspaceSlug,
          repositorySlug
        ),
        getItemId: (branch) => branch.name,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Branch deleted successfully');
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.deleteBranchFailed
        );
      },
    }),
  });

  const resetBranchMutation = useMutation<
    IrminAPIResponse<void>,
    Error,
    { branch: string; commitRef: string; force?: boolean }
  >({
    mutationFn: async ({ branch, commitRef, force }) => {
      const core = await getCore();
      return await core.repositoryBranchService.resetBranch({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        request: { commit_ref: commitRef, force },
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Branch reset successfully');
      // Invalidate branches cache
      void queryClient.invalidateQueries({
        queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
      });
      // Invalidate commits cache since branch now points to different commit
      // Use partial key to match all commits for this repository (any branch, any cursor)
      void queryClient.invalidateQueries({
        queryKey: ['repository-commits', workspaceSlug, repositorySlug],
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.resetBranchFailed
      );
    },
  });

  const revertCommitMutation = useMutation<
    IrminAPIResponse<Commit>,
    Error,
    { branch: string; request: RevertCommitRequest }
  >({
    mutationFn: async ({ branch, request }) => {
      const core = await getCore();
      return await core.repositoryBranchService.revertCommit({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        request,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Commit reverted successfully');
      // Invalidate branches cache
      void queryClient.invalidateQueries({
        queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
      });
      // Invalidate commits cache since a new revert commit was created
      void queryClient.invalidateQueries({
        queryKey: ['repository-commits', workspaceSlug, repositorySlug],
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.revertCommitFailed
      );
    },
  });

  return {
    // Queries
    repositoryBranchesQuery,

    // Mutations
    createBranchMutation,
    deleteBranchMutation,
    resetBranchMutation,
    revertCommitMutation,
  };
}
