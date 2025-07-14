import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoriesQueryKey, repositoryQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Repository } from '@/types/core/Repository';

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

  const deleteRepositoryMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.deleteRepository({
        workspace: workspaceSlug,
        repositorySlug: slug,
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      await queryClient.cancelQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousRepository = queryClient.getQueryData<
        IrminAPIResponse<Repository>
      >(repositoryQueryKey(workspaceSlug, slug));
      const previousRepositories = queryClient.getQueryData<
        IrminAPIResponse<Repository[]>
      >(repositoriesQueryKey(workspaceSlug));

      // Optimistically remove from repositories list cache
      queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
        repositoriesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Repository[]> | undefined) => {
          if (!old?.data) return old;

          const filteredRepositories = old.data.filter(
            (repository: Repository) => repository.slug !== slug
          );

          return {
            ...old,
            data: filteredRepositories,
          };
        }
      );

      // Clear single repository cache
      queryClient.removeQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });

      // Return context for rollback
      return { previousRepository, previousRepositories };
    },
    onError: (error, variables: void, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousRepository?: IrminAPIResponse<Repository>;
            previousRepositories?: IrminAPIResponse<Repository[]>;
          }
        | undefined;
      if (ctx?.previousRepository) {
        queryClient.setQueryData(
          repositoryQueryKey(workspaceSlug, slug),
          ctx.previousRepository
        );
      }
      if (ctx?.previousRepositories) {
        queryClient.setQueryData(
          repositoriesQueryKey(workspaceSlug),
          ctx.previousRepositories
        );
      }
      irminAlert('error', error.message ?? 'Error deleting repository');
    },
    onSuccess: (res: IrminAPIResponse) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Repository deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
    },
  });

  const updateRepositoryMutation = useMutation<
    IrminAPIResponse<Repository>,
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
    onMutate: async (data: RepositoryUpdateInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      await queryClient.cancelQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousRepository = queryClient.getQueryData<
        IrminAPIResponse<Repository>
      >(repositoryQueryKey(workspaceSlug, slug));
      const previousRepositories = queryClient.getQueryData<
        IrminAPIResponse<Repository[]>
      >(repositoriesQueryKey(workspaceSlug));

      // Optimistically update the single repository cache
      queryClient.setQueryData<IrminAPIResponse<Repository>>(
        repositoryQueryKey(workspaceSlug, slug),
        (old: IrminAPIResponse<Repository> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...data,
            },
          };
        }
      );

      // Optimistically update the repositories list cache
      queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
        repositoriesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Repository[]> | undefined) => {
          if (!old?.data) return old;

          const updatedRepositories = old.data.map((repository: Repository) =>
            repository.slug === slug ? { ...repository, ...data } : repository
          );

          return {
            ...old,
            data: updatedRepositories,
          };
        }
      );

      // Return context for rollback
      return { previousRepository, previousRepositories };
    },
    onError: (error, data: RepositoryUpdateInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousRepository?: IrminAPIResponse<Repository>;
            previousRepositories?: IrminAPIResponse<Repository[]>;
          }
        | undefined;
      if (ctx?.previousRepository) {
        queryClient.setQueryData(
          repositoryQueryKey(workspaceSlug, slug),
          ctx.previousRepository
        );
      }
      if (ctx?.previousRepositories) {
        queryClient.setQueryData(
          repositoriesQueryKey(workspaceSlug),
          ctx.previousRepositories
        );
      }
      irminAlert('error', error.message ?? 'Error updating repository');
    },
    onSuccess: (
      res: IrminAPIResponse<Repository>,
      _data: RepositoryUpdateInput
    ) => {
      // Update the cache with the real data from the server if available
      if (res.data) {
        queryClient.setQueryData<IrminAPIResponse<Repository>>(
          repositoryQueryKey(workspaceSlug, slug),
          res
        );

        // Update the repositories list
        queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
          repositoriesQueryKey(workspaceSlug),
          (old: IrminAPIResponse<Repository[]> | undefined) => {
            if (!old?.data) return old;

            const updatedRepositories = old.data.map(
              (repository: Repository) =>
                repository.slug === slug ? res.data! : repository
            );

            return {
              ...old,
              data: updatedRepositories,
            };
          }
        );
      }

      irminAlert('success', res.message ?? 'Repository updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
    },
  });

  const transferRepositoryMutation = useMutation<
    IrminAPIResponse<Repository>,
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
    onSuccess: (res: IrminAPIResponse<Repository>) => {
      void queryClient.invalidateQueries({
        queryKey: repositoryQueryKey(workspaceSlug, slug),
      });
      void queryClient.invalidateQueries({
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
