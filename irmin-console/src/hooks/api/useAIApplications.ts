import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiApplicationQueryKey, aiApplicationsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

import type { AIApplication } from '@/types/core/AIApplication';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type {
  CreateAIApplicationInput,
  UpdateAIApplicationInput,
} from '@/types/internal/AIApplicationInput';

import { createMutationHandlers } from './mutations/utils';

export function useAIApplications() {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const aiApplicationsQuery = useQuery<
    IrminAPIResponse<AIApplication[]>,
    Error
  >({
    queryKey: aiApplicationsQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.listAIApplications({
        workspace: workspaceSlug,
      });
    },
  });

  const createAIApplicationMutation = useMutation<
    IrminAPIResponse<AIApplication>,
    Error,
    CreateAIApplicationInput
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.aiApplicationService.createAIApplication({
        workspace: workspaceSlug,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        allowedOrigins: data.allowed_origins,
        tools: data.tools,
        dataSources: data.data_sources,
        tags: data.tags,
      });
    },
    ...createMutationHandlers<AIApplication, CreateAIApplicationInput>(
      queryClient,
      'ai_applications',
      {
        cacheConfig: {
          primaryQueryKey: aiApplicationsQueryKey(workspaceSlug),
          relatedQueryKeys: [['ai_applications', workspaceSlug]],
          getItemId: (aiApp) => aiApp.id,
          createOptimisticItem: (
            input: CreateAIApplicationInput,
            tempId: string
          ) =>
            ({
              id: tempId,
              name: input.name,
              description: input.description ?? '',
              documentation: input.documentation ?? '',
              allowed_origins: input.allowed_origins ?? [],
              tools: input.tools,
              data_sources: input.data_sources ?? [],
              owner: {
                id: 'temp-owner',
                first_name: 'Current',
                last_name: 'User',
                email: '',
                phone: '',
                company: '',
                language: '',
                profile_picture: '',
              },
              tags: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }) as AIApplication,
        },
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'AI Application created successfully'
          );
          // Invalidate all AI application queries to ensure consistency
          void queryClient.invalidateQueries({
            queryKey: ['ai_applications', workspaceSlug],
          });
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating AI Application');
        },
      }
    ),
  });

  return {
    // Queries
    aiApplicationsQuery,

    // Mutations
    createAIApplicationMutation,
  };
}

/**
 * Hook for fetching and managing a single AI Application
 */
export function useAIApplication(aiApplicationId: string) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const aiApplicationQuery = useQuery<IrminAPIResponse<AIApplication>, Error>({
    queryKey: aiApplicationQueryKey(workspaceSlug, aiApplicationId),
    queryFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.getAIApplication({
        workspace: workspaceSlug,
        aiApplicationId,
      });
    },
  });

  const updateAIApplicationMutation = useMutation<
    IrminAPIResponse<AIApplication>,
    Error,
    UpdateAIApplicationInput,
    { previousData: IrminAPIResponse<AIApplication> | undefined }
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.aiApplicationService.updateAIApplication({
        workspace: workspaceSlug,
        aiApplicationId,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        allowedOrigins: data.allowed_origins,
        tools: data.tools,
        dataSources: data.data_sources,
        tags: data.tags,
        customTools: data.custom_tools,
      });
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: aiApplicationQueryKey(workspaceSlug, aiApplicationId),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<
        IrminAPIResponse<AIApplication>
      >(aiApplicationQueryKey(workspaceSlug, aiApplicationId));

      // Optimistically update to the new value
      if (previousData?.data) {
        const { tags: _tags, ...newDataWithoutTags } = newData;
        queryClient.setQueryData<IrminAPIResponse<AIApplication>>(
          aiApplicationQueryKey(workspaceSlug, aiApplicationId),
          {
            ...previousData,
            data: {
              ...previousData.data,
              ...newDataWithoutTags,
              // For custom_tools, generate temporary IDs for new tools
              custom_tools: newData.custom_tools
                ? newData.custom_tools.map((tool) => ({
                    ...tool,
                    id: tool.id ?? generateTempId('custom-tool'),
                  }))
                : previousData.data.custom_tools,
              // Keep existing tags for optimistic update (server will update with full Tag objects)
              tags: previousData.data.tags,
            },
          }
        );
      }

      return { previousData };
    },
    onSuccess: (res) => {
      irminAlert(
        'success',
        res.message ?? 'AI Application updated successfully'
      );
      // Update the cache with the actual server response
      queryClient.setQueryData<IrminAPIResponse<AIApplication>>(
        aiApplicationQueryKey(workspaceSlug, aiApplicationId),
        res
      );
      void queryClient.invalidateQueries({
        queryKey: aiApplicationsQueryKey(workspaceSlug),
      });
    },
    onError: (error, _newData, context) => {
      irminAlert('error', error.message ?? 'Error updating AI Application');
      // Rollback to the previous value
      if (context?.previousData) {
        queryClient.setQueryData(
          aiApplicationQueryKey(workspaceSlug, aiApplicationId),
          context.previousData
        );
      }
      // Invalidate queries to ensure UI reflects the actual server state
      void queryClient.invalidateQueries({
        queryKey: aiApplicationQueryKey(workspaceSlug, aiApplicationId),
      });
      void queryClient.invalidateQueries({
        queryKey: aiApplicationsQueryKey(workspaceSlug),
      });
    },
  });

  const deleteAIApplicationMutation = useMutation<IrminAPIResponse, Error>({
    mutationFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.deleteAIApplication({
        workspace: workspaceSlug,
        aiApplicationId,
      });
    },
    onSuccess: (res) => {
      irminAlert(
        'success',
        res.message ?? 'AI Application deleted successfully'
      );
      void queryClient.invalidateQueries({
        queryKey: aiApplicationsQueryKey(workspaceSlug),
      });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error deleting AI Application');
    },
  });

  const transferOwnershipMutation = useMutation<
    IrminAPIResponse<AIApplication>,
    Error,
    { newOwnerId: string }
  >({
    mutationFn: async ({ newOwnerId }) => {
      const core = await getCore();
      return await core.aiApplicationService.transferAIApplication({
        workspace: workspaceSlug,
        aiApplicationId,
        newOwnerId,
      });
    },
    onSuccess: (res) => {
      irminAlert(
        'success',
        res.message ?? 'Ownership transferred successfully'
      );
      void queryClient.invalidateQueries({
        queryKey: aiApplicationQueryKey(workspaceSlug, aiApplicationId),
      });
      void queryClient.invalidateQueries({
        queryKey: aiApplicationsQueryKey(workspaceSlug),
      });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error transferring ownership');
    },
  });

  return {
    // Queries
    aiApplicationQuery,

    // Mutations
    updateAIApplicationMutation,
    deleteAIApplicationMutation,
    transferOwnershipMutation,
  };
}
