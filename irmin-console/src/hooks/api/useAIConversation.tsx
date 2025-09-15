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

type UseAIConversationOptions = {
  enabled?: boolean;
};

export function useAIConversation(
  conversationID: string,
  options?: UseAIConversationOptions
) {
  const { getToken } = useIAM();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert, irminConfirm } = usePopup();

  const aiConversationQuery = useQuery<AIConversation>({
    queryKey: aiConversationQueryKey(workspaceSlug, conversationID),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      return await client.conversations.getConversation(conversationID);
    },
    enabled: !!conversationID && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return failureCount < 5;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 10000);
    },
    staleTime: 30000,
    gcTime: 300000,
    networkMode: 'online',
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const aiConversationMessagesQuery = useQuery<AIMessagesListResponse>({
    queryKey: aiConversationMessagesQueryKey(workspaceSlug, conversationID),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const messages =
        await client.conversations.getConversationMessages(conversationID);
      return messages;
    },
    enabled: !!conversationID && options?.enabled !== false,
  });

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
    aiConversationQuery,
    aiConversationMessagesQuery,
    deleteAIConversationMutation,
    updateAIConversationMutation,
    generateTitleMutation,
    handleDeleteConversation,
  };
}
