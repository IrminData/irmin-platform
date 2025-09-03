import { useCallback } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import IrminAIClient from '@/lib/ai';
import {
  aiConversationMessagesQueryKey,
  aiConversationQueryKey,
} from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIConversation } from '@/types/ai/base';
import type { AIUpdateConversationRequest } from '@/types/ai/requests';
import type { AIMessagesListResponse } from '@/types/ai/responses';

type AIConversationInput = {
  title?: string;
  metadata?: Record<string, unknown>;
};

export function useAIConversation(conversationID: string) {
  const { getToken } = useIAM();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert, irminConfirm } = usePopup();

  // Query for fetching a single agent conversation by ID
  const aiConversationQuery = useQuery<AIConversation>({
    queryKey: aiConversationQueryKey(workspaceSlug, conversationID),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const conversation =
        await client.conversations.getConversation(conversationID);
      return conversation;
    },
    enabled: !!conversationID,
  });

  // Query for fetching conversation messages
  const aiConversationMessagesQuery = useQuery<AIMessagesListResponse>({
    queryKey: aiConversationMessagesQueryKey(workspaceSlug, conversationID),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const messages =
        await client.conversations.getConversationMessages(conversationID);
      return messages;
    },
    enabled: !!conversationID,
  });

  // Mutation for deleting an agent conversation
  const deleteAIConversationMutation = useMutation<void, Error, string>({
    mutationFn: async (convId: string) => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      await client.conversations.deleteConversation(convId);
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error deleting the conversation');
    },
    onSuccess: () => {
      irminAlert('success', 'Conversation deleted successfully');
    },
  });

  // Handler for deleting a conversation
  const { mutate: deleteAIConversation } = deleteAIConversationMutation;
  const handleDeleteConversation = useCallback(async () => {
    if (!conversationID) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${aiConversationQuery.data?.title})`
    );
    if (confirmed) {
      deleteAIConversation(conversationID);
    }
  }, [
    dict,
    irminConfirm,
    aiConversationQuery.data,
    deleteAIConversation,
    conversationID,
  ]);

  // Mutation for updating an agent conversation
  const updateAIConversationMutation = useMutation<
    AIConversation,
    Error,
    AIConversationInput
  >({
    mutationFn: async (input: AIConversationInput) => {
      if (!conversationID) throw new Error('Conversation ID is required');
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);

      const request: AIUpdateConversationRequest = {
        title: input.title,
        metadata: input.metadata,
      };

      const updatedConversation = await client.conversations.updateConversation(
        conversationID,
        request
      );
      return updatedConversation;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating the conversation');
    },
    onSuccess: () => {
      irminAlert('success', 'Conversation updated successfully');
    },
  });

  // Mutation for generating conversation title
  const generateTitleMutation = useMutation<AIConversation, Error, void>({
    mutationFn: async () => {
      if (!conversationID) throw new Error('Conversation ID is required');
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const updatedConversation =
        await client.conversations.generateConversationTitle(conversationID);
      return updatedConversation;
    },
    onSuccess: () => {
      irminAlert('success', 'Title generated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error generating title');
    },
  });

  return {
    // Queries
    aiConversationQuery,
    aiConversationMessagesQuery,

    // Mutations
    deleteAIConversationMutation,
    updateAIConversationMutation,
    generateTitleMutation,

    // Handlers
    handleDeleteConversation,
  };
}
