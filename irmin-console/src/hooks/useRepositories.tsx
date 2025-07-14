import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoriesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Repository } from '@/types/core/Repository';

type RepositoryCreateInput = {
  name: string;
  description: string;
  documentation: string;
  default_branch: string;
  isImmutable: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
};

export function useRepositories() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoriesQuery = useQuery<IrminAPIResponse<Repository[]>, Error>({
    queryKey: repositoriesQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.fetchRepositories({
        workspace: workspaceSlug,
      });
    },
  });

  const createRepositoryMutation = useMutation<
    IrminAPIResponse<Repository>,
    Error,
    RepositoryCreateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.createRepository({
        workspace: workspaceSlug,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        defaultBranch: data.default_branch,
        isImmutable: data.isImmutable,
        garbageDefaultRetentionDays: data.garbageDefaultRetentionDays,
        garbageDefaultBranchRetentionDays:
          data.garbageDefaultBranchRetentionDays,
      });
    },
    onMutate: async (data: RepositoryCreateInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousRepositories = queryClient.getQueryData<
        IrminAPIResponse<Repository[]>
      >(repositoriesQueryKey(workspaceSlug));

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('repositories');

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
        repositoriesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Repository[]> | undefined) => {
          if (!old?.data) return old;

          // Create optimistic repository object
          const optimisticRepository: Repository = {
            id: tempId, // Unique temporary ID
            name: data.name,
            description: data.description,
            documentation: data.documentation,
            slug: data.name.toLowerCase().replace(/\s+/g, '-'),
            is_immutable: data.isImmutable,
            default_branch: data.default_branch,
            // Add required fields with default values
            owner: {
              id: 'temp-owner',
              first_name: 'Current',
              last_name: 'User',
              email: '',
              phone: '',
              company: '',
              profile_picture: '',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return {
            ...old,
            data: [...old.data, optimisticRepository],
          };
        }
      );

      // Return context for rollback
      return { previousRepositories, tempId };
    },
    onError: (error, data: RepositoryCreateInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousRepositories?: IrminAPIResponse<Repository[]>;
            tempId?: string;
          }
        | undefined;
      if (ctx?.previousRepositories) {
        queryClient.setQueryData(
          repositoriesQueryKey(workspaceSlug),
          ctx.previousRepositories
        );
      }
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating repository');
    },
    onSuccess: (
      res: IrminAPIResponse<Repository>,
      data: RepositoryCreateInput,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | {
            previousRepositories?: IrminAPIResponse<Repository[]>;
            tempId?: string;
          }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Repository[]>>(
        repositoriesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Repository[]> | undefined) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic repository with the real one using exact temp ID
          const updatedRepositories = old.data.map((repository: Repository) =>
            repository.id === ctx.tempId ? res.data! : repository
          );

          return {
            ...old,
            data: updatedRepositories,
          };
        }
      );

      irminAlert('success', res.message ?? 'Repository created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
    },
  });

  return {
    // Queries
    repositoriesQuery,

    // Mutations
    createRepositoryMutation,
  };
}
