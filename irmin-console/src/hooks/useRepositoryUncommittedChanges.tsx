import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { Diff } from '@/types/core/Diff';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { repositoryCommitsQueryKey } from './useRepositoryCommits';
import { repositoryObjectHistoryQueryKey } from './useRepositoryObjectHistory';

export const repositoryUncommittedChangesQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  branch: string
) =>
  [
    'repository-uncommitted-changes',
    workspaceSlug,
    repositorySlug,
    branch,
  ] as const;

export function useRepositoryUncommittedChanges(
  repositorySlug: string,
  branch: string
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const uncommittedChangesQuery = useQuery<IrminAPIResponse<Diff>, Error>({
    queryKey: repositoryUncommittedChangesQueryKey(
      workspaceSlug,
      repositorySlug,
      branch
    ),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryCommitService.createCommit({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        message: data.message,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryCommitsQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      queryClient.invalidateQueries({
        queryKey: repositoryUncommittedChangesQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      queryClient.invalidateQueries({
        queryKey: repositoryObjectHistoryQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      irminAlert('success', res.message ?? 'Commit created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating commit');
    },
  });

  const revertChangesMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryCommitService.revertUncommittedChanges({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
        path: '/',
        pathType: 'reset',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryUncommittedChangesQueryKey(
          workspaceSlug,
          repositorySlug,
          branch
        ),
      });
      irminAlert('success', res.message ?? 'Changes reverted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error reverting changes');
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
