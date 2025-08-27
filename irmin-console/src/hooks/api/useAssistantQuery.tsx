import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import {
  assistantConversationQueryKey,
  assistantQueryConversationsQueryKey,
} from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  AssistantConversation,
  AssistantMessage,
} from '@/types/core/Assistant';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

type GenerateQueryInput = {
  prompt: string;
  repositorySlug?: string;
  repositoryRef?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
};

export function useAssistantQuery() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert } = usePopup();

  // Query for fetching all query generation conversations
  const assistantQueryConversationsQuery = useQuery<
    IrminAPIResponse<AssistantConversation[]>
  >({
    queryKey: assistantQueryConversationsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const conversations = await core.assistantQueryService.listConversations({
        workspace: workspaceSlug,
      });
      return conversations;
    },
    enabled: !!workspaceSlug,
  });

  // Mutation for generating a query
  const generateQueryMutation = useMutation<
    IrminAPIResponse<AssistantMessage[]>,
    Error,
    GenerateQueryInput
  >({
    mutationFn: async (input: GenerateQueryInput) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.assistantQueryService.generateQuery({
        workspace: workspaceSlug,
        prompt: input.prompt,
        repositorySlug: input.repositorySlug,
        repositoryRef: input.repositoryRef,
        conversationId: input.conversationId,
        metadata: input.metadata,
      });
      return res;
    },
    onMutate: async (input: GenerateQueryInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: assistantQueryConversationsQueryKey(workspaceSlug),
      });

      if (input.conversationId) {
        await queryClient.cancelQueries({
          queryKey: assistantConversationQueryKey(
            workspaceSlug,
            input.conversationId
          ),
        });
      }

      // Snapshot the previous values
      const previousConversations = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation[]>
      >(assistantQueryConversationsQueryKey(workspaceSlug));

      let previousConversation:
        | IrminAPIResponse<AssistantConversation>
        | undefined;
      if (input.conversationId) {
        previousConversation = queryClient.getQueryData<
          IrminAPIResponse<AssistantConversation>
        >(assistantConversationQueryKey(workspaceSlug, input.conversationId));
      }

      // Optimistically add the user message to the conversation
      const userMessage: AssistantMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: input.conversationId || 'temp',
        role: 'user',
        content: input.prompt,
        content_type: 'text',
        metadata: {},
        ai_model: 'unknown',
        status: 'pending',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistically update the conversations list cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
        assistantQueryConversationsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
          if (!old?.data) return old;

          const updatedConversations = old.data.map(
            (conversation: AssistantConversation) =>
              conversation.id === input.conversationId
                ? {
                    ...conversation,
                    total_messages: conversation.total_messages + 1,
                    user_messages: conversation.user_messages + 1,
                    last_message_at: new Date().toISOString(),
                  }
                : conversation
          );

          return {
            ...old,
            data: updatedConversations,
          };
        }
      );

      // If we have a conversation ID, optimistically update that conversation
      if (input.conversationId) {
        queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
          assistantConversationQueryKey(workspaceSlug, input.conversationId),
          (old: IrminAPIResponse<AssistantConversation> | undefined) => {
            if (!old?.data) return old;

            return {
              ...old,
              data: {
                ...old.data,
                messages: old.data.messages
                  ? [...old.data.messages, userMessage]
                  : [userMessage],
                total_messages: old.data.total_messages + 1,
                user_messages: old.data.user_messages + 1,
                last_message_at: new Date().toISOString(),
              },
            };
          }
        );
      }

      // Return context for rollback
      return { previousConversations, previousConversation };
    },
    onSuccess: (
      res: IrminAPIResponse<AssistantMessage[]>,
      input: GenerateQueryInput
    ) => {
      // Append the new messages received from the API to the conversation
      if (res.data && res.data.length > 0) {
        const newMessages = res.data;

        // Update the conversations list with the new message count
        queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
          assistantQueryConversationsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
            if (!old?.data) return old;

            const updatedConversations = old.data.map(
              (conversation: AssistantConversation) =>
                conversation.id === input.conversationId
                  ? {
                      ...conversation,
                      total_messages:
                        conversation.total_messages + newMessages.length,
                      assistant_messages:
                        conversation.assistant_messages + newMessages.length,
                      last_message_at: new Date().toISOString(),
                    }
                  : conversation
            );

            return {
              ...old,
              data: updatedConversations,
            };
          }
        );

        // If we have a conversation ID, update that specific conversation
        if (input.conversationId) {
          queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
            assistantConversationQueryKey(workspaceSlug, input.conversationId),
            (old: IrminAPIResponse<AssistantConversation> | undefined) => {
              if (!old?.data) return old;

              return {
                ...old,
                data: {
                  ...old.data,
                  messages: old.data.messages
                    ? [...old.data.messages, ...newMessages]
                    : newMessages,
                  total_messages: old.data.total_messages + newMessages.length,
                  assistant_messages:
                    old.data.assistant_messages + newMessages.length,
                  last_message_at: new Date().toISOString(),
                },
              };
            }
          );
        }

        irminAlert('success', 'Query generated successfully');
      }
    },
    onError: (error, input: GenerateQueryInput, context: unknown) => {
      // Rollback on error
      const typedContext = context as
        | {
            previousConversations?: IrminAPIResponse<AssistantConversation[]>;
            previousConversation?: IrminAPIResponse<AssistantConversation>;
          }
        | undefined;

      if (typedContext?.previousConversations) {
        queryClient.setQueryData(
          assistantQueryConversationsQueryKey(workspaceSlug),
          typedContext.previousConversations
        );
      }
      if (typedContext?.previousConversation && input.conversationId) {
        queryClient.setQueryData(
          assistantConversationQueryKey(workspaceSlug, input.conversationId),
          typedContext.previousConversation
        );
      }

      irminAlert('error', error.message ?? 'Error generating query');
    },
  });

  // Handler for generating a query
  const { mutate: generateQuery, isPending: isGeneratingQuery } =
    generateQueryMutation;

  const handleGenerateQuery = useCallback(
    async (input: GenerateQueryInput) => {
      generateQuery(input);
    },
    [generateQuery]
  );

  return {
    // Queries
    assistantQueryConversationsQuery,

    // Mutations
    generateQueryMutation,

    // Handlers
    handleGenerateQuery,
    isGeneratingQuery,
  };
}
