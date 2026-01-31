import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositoriesQueryKey, repositoryQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Repository } from '@/types/core/Repository';

import {
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type RepositoryUpdateInput = {
  name?: string;
  description?: string;
  documentation?: string;
  isImmutable?: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
};

export function useRepository(slug: string) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryQuery = useQuery<IrminAPIResponse<Repository>, Error>({
    queryKey: repositoryQueryKey(workspaceSlug, slug),
    queryFn: async () => {
      const core = await getCore();
      return await core.repositoryService.fetchRepository({
        workspace: workspaceSlug,
        slug: slug,
      });
    },
    initialData: () => {
      const repositories = queryClient.getQueryData<
        IrminAPIResponse<Repository[]>
      >(repositoriesQueryKey(workspaceSlug));
      return repositories?.data?.find((r: Repository) => r.slug === slug)
        ? {
            data: repositories.data.find((r: Repository) => r.slug === slug),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
  });

  const deleteRepositoryMutation = useMutation<IrminAPIResponse, Error, string>(
    {
      mutationFn: async (repositorySlug: string) => {
        const core = await getCore();
        return await core.repositoryService.deleteRepository({
          workspace: workspaceSlug,
          repositorySlug,
        });
      },
      ...deleteMutationHandlers<Repository>(queryClient, {
        cacheConfig: {
          primaryQueryKey: repositoriesQueryKey(workspaceSlug),
          getItemId: (repository) => repository.slug,
        },
        singleItemQueryKey: repositoryQueryKey(workspaceSlug, slug),
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Repository deleted successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error deleting repository');
        },
      }),
    }
  );

  const updateRepositoryMutation = useMutation<
    IrminAPIResponse<Repository>,
    Error,
    RepositoryUpdateInput
  >({
    mutationFn: async (data) => {
      const core = await getCore();
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
    ...updateMutationHandlers<Repository, RepositoryUpdateInput>(queryClient, {
      cacheConfig: {
        primaryQueryKey: repositoriesQueryKey(workspaceSlug),
        getItemId: (repository) => repository.slug,
      },
      singleItemQueryKey: repositoryQueryKey(workspaceSlug, slug),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Repository updated successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error updating repository');
      },
    }),
  });

  const transferRepositoryMutation = useMutation<
    IrminAPIResponse<Repository>,
    Error,
    string
  >({
    mutationFn: async (newOwnerID) => {
      const core = await getCore();
      return await core.repositoryService.transferRepository({
        workspace: workspaceSlug,
        slug: slug,
        newOwnerID: newOwnerID,
      });
    },
    onSuccess: (res: IrminAPIResponse<Repository>) => {
      // Update both the single repository and repositories list cache optimistically
      if (res.data) {
        // Update single repository cache
        queryClient.setQueryData(repositoryQueryKey(workspaceSlug, slug), res);

        // Update repositories list cache
        queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
          repositoriesQueryKey(workspaceSlug),
          (old) => {
            if (!old?.data) return old;

            return {
              ...old,
              data: old.data.map((repo) =>
                repo.slug === slug ? res.data! : repo
              ),
            };
          }
        );
      }

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
