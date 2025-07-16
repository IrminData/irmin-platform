import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import type { CreateBranchRequest } from '@/lib/core/resources/RepositoryBranchService';
import { repositoryBranchesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Branch } from '@/types/core/Branch';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

export function useRepositoryBranches(repositorySlug: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryBranchesQuery = useQuery<IrminAPIResponse<Branch[]>, Error>({
    queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
          irminAlert('error', error.message ?? 'Error creating branch');
        },
      }
    ),
  });

  const deleteBranchMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (branch) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
        irminAlert('error', error.message ?? 'Error deleting branch');
      },
    }),
  });

  return {
    // Queries
    repositoryBranchesQuery,

    // Mutations
    createBranchMutation,
    deleteBranchMutation,
  };
}
