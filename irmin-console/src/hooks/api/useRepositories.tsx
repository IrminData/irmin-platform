import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoriesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Repository } from '@/types/core/Repository';

import { createMutationHandlers } from './mutations/utils';

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
    ...createMutationHandlers<Repository, RepositoryCreateInput>(
      queryClient,
      'repositories',
      {
        cacheConfig: {
          primaryQueryKey: repositoriesQueryKey(workspaceSlug),
          getItemId: (repository) => repository.id,
          createOptimisticItem: (
            input: RepositoryCreateInput,
            tempId: string
          ) => ({
            id: tempId,
            name: input.name,
            description: input.description,
            documentation: input.documentation,
            slug: input.name.toLowerCase().replace(/\s+/g, '-'),
            is_immutable: input.isImmutable,
            default_branch: input.default_branch,
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
          }),
        },
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Repository created successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating repository');
        },
      }
    ),
  });

  return {
    // Queries
    repositoriesQuery,

    // Mutations
    createRepositoryMutation,
  };
}
