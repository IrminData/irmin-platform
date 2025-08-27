import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { assistantConversationsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AssistantConversation } from '@/types/core/Assistant';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { createMutationHandlers } from './mutations/utils';

type CreateAssistantConversationMutation = {
  title?: string;
  metadata?: Record<string, unknown>;
};

export function useAssistantConversations() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  // Query for fetching all assistant conversations in the current workspace
  const assistantConversationsQuery = useQuery<
    IrminAPIResponse<AssistantConversation[]>
  >({
    queryKey: assistantConversationsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const conversations = await core.assistantService.listConversations({
        workspace: workspaceSlug,
      });
      return conversations;
    },
  });

  // Mutation for creating a new assistant conversation
  const createAssistantConversationMutation = useMutation<
    IrminAPIResponse<AssistantConversation>,
    Error,
    CreateAssistantConversationMutation
  >({
    mutationFn: async (input) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const newConversation = await core.assistantService.createConversation({
        workspace: workspaceSlug,
        title: input.title,
        metadata: input.metadata,
      });
      return newConversation;
    },
    ...createMutationHandlers<
      AssistantConversation,
      CreateAssistantConversationMutation
    >(queryClient, 'assistant-conversations', {
      cacheConfig: {
        primaryQueryKey: assistantConversationsQueryKey(workspaceSlug),
        getItemId: (conversation) => conversation.id,
        createOptimisticItem: (
          input: CreateAssistantConversationMutation,
          tempId: string
        ) => ({
          id: tempId,
          title: input.title || 'New Conversation',
          workspace_id: workspaceSlug,
          user_id: 'temp-user-id',
          metadata: input.metadata || {},
          messages: [],
          total_messages: 0,
          user_messages: 0,
          assistant_messages: 0,
          estimated_tokens: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      },
      onSuccess: (res) => {
        irminAlert(
          'success',
          res.message ?? 'Conversation created successfully'
        );
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Failed to create conversation');
      },
    }),
  });

  return {
    // Queries
    assistantConversationsQuery,

    // Mutations
    createAssistantConversationMutation,
  };
}
