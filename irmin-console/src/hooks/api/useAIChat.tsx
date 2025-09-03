import { useMutation } from '@tanstack/react-query';

import IrminAIClient from '@/lib/ai';

import { useIAM } from '@/context/IAMContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIChatRequest } from '@/types/ai/requests';
import type { AIChatResponse } from '@/types/ai/responses';

export function useAIChat() {
  const { getToken } = useIAM();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();

  // Mutation for chat (handles both streaming and non-streaming)
  const chatMutation = useMutation<
    AIChatResponse | ReadableStream<Uint8Array>,
    Error,
    AIChatRequest
  >({
    mutationFn: async (request) => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const response = await client.chat.chat(request);
      return response;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to send chat message');
    },
  });

  // Helper function for non-streaming chat
  const sendMessage = (message: string, options?: Partial<AIChatRequest>) => {
    const request: AIChatRequest = {
      message,
      stream: false,
      ...options,
    };
    return chatMutation.mutateAsync(request);
  };

  // Helper function for streaming chat
  const sendMessageStream = (
    message: string,
    options?: Partial<AIChatRequest>
  ) => {
    const request: AIChatRequest = {
      message,
      stream: true,
      ...options,
    };
    return chatMutation.mutateAsync(request);
  };

  // Helper function to continue a conversation
  const continueConversation = (
    conversationId: string,
    message: string,
    options?: Partial<AIChatRequest>
  ) => {
    const request: AIChatRequest = {
      conversationId,
      message,
      stream: false,
      ...options,
    };
    return chatMutation.mutateAsync(request);
  };

  // Helper function to continue a conversation with streaming
  const continueConversationStream = (
    conversationId: string,
    message: string,
    options?: Partial<AIChatRequest>
  ) => {
    const request: AIChatRequest = {
      conversationId,
      message,
      stream: true,
      ...options,
    };
    return chatMutation.mutateAsync(request);
  };

  return {
    // Mutations
    chatMutation,

    // Chat helper functions
    sendMessage,
    sendMessageStream,
    continueConversation,
    continueConversationStream,

    // Reset functions
    resetChat: chatMutation.reset,
  };
}
