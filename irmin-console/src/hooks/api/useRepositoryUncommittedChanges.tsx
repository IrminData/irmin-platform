import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  repositoryCommitsQueryKey,
  repositoryObjectHistoryQueryKey,
  repositoryUncommittedChangesQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Diff } from '@/types/core/Diff';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useRepositoryUncommittedChanges(
  repositorySlug: string,
  branch: string
) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const uncommittedChangesQuery = useQuery<IrminAPIResponse<Diff>, Error>({
    queryKey: repositoryUncommittedChangesQueryKey(
      workspaceSlug,
      repositorySlug,
      branch
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.repositoryBranchService.getUncommittedChanges({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
      });
    },
  });

  const commitChangesMutation = useMutation<
    IrminAPIResponse,
    Error,
    { message: string }
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.repositoryCommitService.createCommit({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        message: data.message,
      });
    },
    onSuccess: (res) => {
      // These are special operations that need to invalidate multiple related queries
      void queryClient.invalidateQueries({
        queryKey: repositoryCommitsQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoryUncommittedChangesQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoryObjectHistoryQueryKey(
          workspaceSlug,
          repositorySlug,
          branch,
          '/'
        ),
      });
      irminAlert('success', res.message ?? 'Commit created successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.createCommitFailed
      );
    },
  });

  const revertChangesMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      const core = await getCore();
      return await core.repositoryCommitService.revertUncommittedChanges({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        path: '/',
        pathType: 'reset',
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: repositoryUncommittedChangesQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      irminAlert('success', res.message ?? 'Changes reverted successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.revertChangesFailed
      );
    },
  });

  return {
    // Queries
    uncommittedChangesQuery,

    // Mutations
    commitChangesMutation,
    revertChangesMutation,
  };
}
