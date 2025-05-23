import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';

import { repositoriesQueryKey } from './useRepositories';

export const repositoryQueryKey = (workspaceSlug: string, slug: string) =>
  ['repository', workspaceSlug, slug] as const;

type RepositoryUpdateInput = {
  name?: string;
  description?: string;
  documentation?: string;
  isImmutable?: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
};

export function useRepository(slug: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryQuery = useQuery<IrminAPIResponse<Repository>, Error>({
    queryKey: repositoryQueryKey(workspaceSlug, slug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.fetchRepository({
        workspace: workspaceSlug,
        slug: slug,
      });
    },
  });

  const deleteRepositoryMutation = useMutation<IrminAPIResponse, Error>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.deleteRepository({
        workspace: workspaceSlug,
        repositorySlug: slug,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Repository deleted successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error deleting repository');
    },
  });

  const updateRepositoryMutation = useMutation<
    IrminAPIResponse,
    Error,
    RepositoryUpdateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.updateRepository({
        workspace: workspaceSlug,
        slug: slug,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        isImmutable: data.isImmutable,
        garbageDefaultRetentionDays: data.garbageDefaultRetentionDays,
        garbageDefaultBranchRetentionDays:
          data.garbageDefaultBranchRetentionDays,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Repository updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating repository');
    },
  });

  const transferRepositoryMutation = useMutation<
    IrminAPIResponse,
    Error,
    string
  >({
    mutationFn: async (newOwnerID) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.transferRepository({
        workspace: workspaceSlug,
        slug: slug,
        newOwnerID: newOwnerID,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Repository transferred successfully'
      );
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error transferring repository');
    },
  });

  return {
    // Queries
    repositoryQuery,

    // Mutations
    deleteRepositoryMutation,
    updateRepositoryMutation,
    transferRepositoryMutation,
  };
}
