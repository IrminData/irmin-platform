import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositoryTagsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { GitTag } from '@/types/core/GitTag';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

export function useRepositoryTags(repositorySlug: string) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryTagsQuery = useQuery<IrminAPIResponse<GitTag[]>, Error>({
    queryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.repositoryTagService.fetchTags({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
    },
  });

  const createTagMutation = useMutation<
    IrminAPIResponse<GitTag>,
    Error,
    { name: string; ref: string }
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.repositoryTagService.createTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        name: data.name,
        ref: data.ref,
      });
    },
    ...createMutationHandlers<GitTag, { name: string; ref: string }>(
      queryClient,
      'repository-tags',
      {
        cacheConfig: {
          primaryQueryKey: repositoryTagsQueryKey(
            workspaceSlug,
            repositorySlug
          ),
          getItemId: (tag) => tag.name,
          createOptimisticItem: (input) => ({
            name: input.name,
            ref: input.ref,
            commit: {
              hash: 'temp-commit',
              message: 'Loading...',
              author: 'Current User',
              timestamp: new Date().toISOString(),
            },
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Tag created successfully');
        },
        onError: (error) => {
          irminAlert(
            'error',
            error.message ?? dict.common.errors.mutations.createTagFailed
          );
        },
      }
    ),
  });

  const deleteTagMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (tag) => {
      const core = await getCore();
      return await core.repositoryTagService.deleteTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        tag,
      });
    },
    ...deleteMutationHandlers<GitTag>(queryClient, {
      cacheConfig: {
        primaryQueryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
        getItemId: (tag) => tag.name,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Tag deleted successfully');
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.deleteTagFailed
        );
      },
    }),
  });

  return {
    // Queries
    repositoryTagsQuery,

    // Mutations
    createTagMutation,
    deleteTagMutation,
  };
}
