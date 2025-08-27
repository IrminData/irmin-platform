import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import {
  assistantConversationQueryKey,
  assistantConversationsQueryKey,
  assistantConversationStatsQueryKey,
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

import { deleteMutationHandlers } from './mutations/utils';

type UpdateAssistantConversationInput = {
  title?: string;
  metadata?: Record<string, unknown>;
};

type SendMessageInput = {
  message: string;
};

export function useAssistantConversation(conversationID: string) {
  const { getToken } = useIAM();
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert, irminConfirm } = usePopup();

  // Query for fetching a single assistant conversation by ID
  const assistantConversationQuery = useQuery<
    IrminAPIResponse<AssistantConversation>
  >({
    queryKey: assistantConversationQueryKey(workspaceSlug, conversationID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const conversation = await core.assistantService.getConversation({
        workspace: workspaceSlug,
        conversationID,
      });
      return conversation;
    },
    enabled: !!conversationID,
  });

  // Mutation for deleting an assistant conversation
  const deleteAssistantConversationMutation = useMutation<
    IrminAPIResponse,
    Error,
    string
  >({
    mutationFn: async (convId: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.assistantService.deleteConversation({
        workspace: workspaceSlug,
        conversationID: convId,
      });
      return res;
    },
    ...deleteMutationHandlers<AssistantConversation>(queryClient, {
      cacheConfig: {
        primaryQueryKey: assistantConversationsQueryKey(workspaceSlug),
        getItemId: (conversation) => conversation.id,
      },
      singleItemQueryKey: assistantConversationQueryKey(
        workspaceSlug,
        conversationID || ''
      ),
      onSuccess: (res) => {
        irminAlert(
          'success',
          res.message ?? 'Conversation deleted successfully'
        );
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error deleting the conversation');
      },
    }),
  });

  // Handler for deleting a conversation
  const { mutate: deleteAssistantConversation } =
    deleteAssistantConversationMutation;
  const handleDeleteConversation = useCallback(async () => {
    if (!conversationID) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${assistantConversationQuery.data?.data?.title})`
    );
    if (confirmed) {
      deleteAssistantConversation(conversationID);
    }
  }, [
    dict,
    irminConfirm,
    assistantConversationQuery.data?.data,
    deleteAssistantConversation,
    conversationID,
  ]);

  // Mutation for updating an assistant conversation
  const updateAssistantConversationMutation = useMutation<
    IrminAPIResponse,
    Error,
    UpdateAssistantConversationInput
  >({
    mutationFn: async (input: UpdateAssistantConversationInput) => {
      if (!conversationID) throw new Error('Conversation ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.assistantService.updateConversation({
        workspace: workspaceSlug,
        conversationID,
        title: input.title,
        metadata: input.metadata,
      });
      return res;
    },
    onMutate: async (input: UpdateAssistantConversationInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: assistantConversationQueryKey(workspaceSlug, conversationID),
      });
      await queryClient.cancelQueries({
        queryKey: assistantConversationsQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousConversation = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation>
      >(assistantConversationQueryKey(workspaceSlug, conversationID));
      const previousConversations = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation[]>
      >(assistantConversationsQueryKey(workspaceSlug));

      // Optimistically update the single conversation cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
        assistantConversationQueryKey(workspaceSlug, conversationID),
        (old: IrminAPIResponse<AssistantConversation> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
            },
          };
        }
      );

      // Optimistically update the conversations list cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
        assistantConversationsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
          if (!old?.data) return old;

          const updatedConversations = old.data.map(
            (conversation: AssistantConversation) =>
              conversation.id === conversationID
                ? { ...conversation, ...input }
                : conversation
          );

          return {
            ...old,
            data: updatedConversations,
          };
        }
      );

      // Return context for rollback
      return { previousConversation, previousConversations };
    },
    onError: (
      error,
      input: UpdateAssistantConversationInput,
      context: unknown
    ) => {
      // Rollback on error
      const typedContext = context as
        | {
            previousConversation?: IrminAPIResponse<AssistantConversation>;
            previousConversations?: IrminAPIResponse<AssistantConversation[]>;
          }
        | undefined;

      if (typedContext?.previousConversation) {
        queryClient.setQueryData(
          assistantConversationQueryKey(workspaceSlug, conversationID),
          typedContext.previousConversation
        );
      }
      if (typedContext?.previousConversations) {
        queryClient.setQueryData(
          assistantConversationsQueryKey(workspaceSlug),
          typedContext.previousConversations
        );
      }
      irminAlert('error', error.message ?? 'Error updating the conversation');
    },
    onSuccess: (
      res: IrminAPIResponse,
      _input: UpdateAssistantConversationInput
    ) => {
      // Update the cache with the real data from the server
      void queryClient.invalidateQueries({
        queryKey: assistantConversationQueryKey(workspaceSlug, conversationID),
      });
      void queryClient.invalidateQueries({
        queryKey: assistantConversationsQueryKey(workspaceSlug),
      });

      irminAlert('success', res.message ?? 'Conversation updated successfully');
    },
  });

  // Mutation for clearing a conversation
  const clearAssistantConversationMutation = useMutation<
    IrminAPIResponse,
    Error,
    string
  >({
    mutationFn: async (convId: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.assistantService.clearConversation({
        workspace: workspaceSlug,
        conversationID: convId,
      });
      return res;
    },
    onMutate: async (convId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: assistantConversationQueryKey(workspaceSlug, convId),
      });
      await queryClient.cancelQueries({
        queryKey: assistantConversationsQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousConversation = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation>
      >(assistantConversationQueryKey(workspaceSlug, convId));
      const previousConversations = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation[]>
      >(assistantConversationsQueryKey(workspaceSlug));

      // Optimistically update the single conversation cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
        assistantConversationQueryKey(workspaceSlug, convId),
        (old: IrminAPIResponse<AssistantConversation> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              messages: [],
              total_messages: 0,
              user_messages: 0,
              assistant_messages: 0,
              estimated_tokens: 0,
              last_message_at: undefined,
            },
          };
        }
      );

      // Optimistically update the conversations list cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
        assistantConversationsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
          if (!old?.data) return old;

          const updatedConversations = old.data.map(
            (conversation: AssistantConversation) =>
              conversation.id === convId
                ? {
                    ...conversation,
                    messages: [],
                    total_messages: 0,
                    user_messages: 0,
                    assistant_messages: 0,
                    estimated_tokens: 0,
                    last_message_at: undefined,
                  }
                : conversation
          );

          return {
            ...old,
            data: updatedConversations,
          };
        }
      );

      // Return context for rollback
      return { previousConversation, previousConversations };
    },
    onError: (error, convId: string, context: unknown) => {
      // Rollback on error
      const typedContext = context as
        | {
            previousConversation?: IrminAPIResponse<AssistantConversation>;
            previousConversations?: IrminAPIResponse<AssistantConversation[]>;
          }
        | undefined;

      if (typedContext?.previousConversation) {
        queryClient.setQueryData(
          assistantConversationQueryKey(workspaceSlug, convId),
          typedContext.previousConversation
        );
      }
      if (typedContext?.previousConversations) {
        queryClient.setQueryData(
          assistantConversationsQueryKey(workspaceSlug),
          typedContext.previousConversations
        );
      }
      irminAlert('error', error.message ?? 'Error clearing the conversation');
    },
    onSuccess: (res: IrminAPIResponse, convId: string) => {
      // Invalidate queries to refetch fresh data
      void queryClient.invalidateQueries({
        queryKey: assistantConversationQueryKey(workspaceSlug, convId),
      });
      void queryClient.invalidateQueries({
        queryKey: assistantConversationsQueryKey(workspaceSlug),
      });
      void queryClient.invalidateQueries({
        queryKey: assistantConversationStatsQueryKey(workspaceSlug, convId),
      });

      irminAlert('success', res.message ?? 'Conversation cleared successfully');
    },
  });

  // Mutation for sending a message
  const sendMessageMutation = useMutation<
    IrminAPIResponse<AssistantMessage[]>,
    Error,
    SendMessageInput
  >({
    mutationFn: async (input: SendMessageInput) => {
      if (!conversationID) throw new Error('Conversation ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.assistantService.sendMessage({
        workspace: workspaceSlug,
        conversationID,
        message: input.message,
      });
      return res;
    },
    onMutate: async (input: SendMessageInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: assistantConversationQueryKey(workspaceSlug, conversationID),
      });
      await queryClient.cancelQueries({
        queryKey: assistantConversationsQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousConversation = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation>
      >(assistantConversationQueryKey(workspaceSlug, conversationID));
      const previousConversations = queryClient.getQueryData<
        IrminAPIResponse<AssistantConversation[]>
      >(assistantConversationsQueryKey(workspaceSlug));

      // Optimistically add the user message to the conversation
      const userMessage: AssistantMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationID,
        role: 'user',
        content: input.message,
        content_type: 'text',
        metadata: {},
        ai_model: 'unknown',
        status: 'pending',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistically update the single conversation cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
        assistantConversationQueryKey(workspaceSlug, conversationID),
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

      // Optimistically update the conversations list cache
      queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
        assistantConversationsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
          if (!old?.data) return old;

          const updatedConversations = old.data.map(
            (conversation: AssistantConversation) =>
              conversation.id === conversationID
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

      // Return context for rollback
      return { previousConversation, previousConversations };
    },
    onSuccess: (
      res: IrminAPIResponse<AssistantMessage[]>,
      _input: SendMessageInput
    ) => {
      // Append the new messages received from the API to the conversation
      if (res.data && res.data.length > 0) {
        const newMessages = res.data;

        queryClient.setQueryData<IrminAPIResponse<AssistantConversation>>(
          assistantConversationQueryKey(workspaceSlug, conversationID),
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

        // Update the conversations list with the new message count
        queryClient.setQueryData<IrminAPIResponse<AssistantConversation[]>>(
          assistantConversationsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<AssistantConversation[]> | undefined) => {
            if (!old?.data) return old;

            const updatedConversations = old.data.map(
              (conversation: AssistantConversation) =>
                conversation.id === conversationID
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

        irminAlert('success', 'Message sent successfully');
      }

      // Let it fetch fresh data in the background for stats and any other updates
      void queryClient.invalidateQueries({
        queryKey: assistantConversationStatsQueryKey(
          workspaceSlug,
          conversationID
        ),
      });
    },
    onError: (error, _input: SendMessageInput, context: unknown) => {
      // Rollback on error
      const typedContext = context as
        | {
            previousConversation?: IrminAPIResponse<AssistantConversation>;
            previousConversations?: IrminAPIResponse<AssistantConversation[]>;
          }
        | undefined;

      if (typedContext?.previousConversation) {
        queryClient.setQueryData(
          assistantConversationQueryKey(workspaceSlug, conversationID),
          typedContext.previousConversation
        );
      }
      if (typedContext?.previousConversations) {
        queryClient.setQueryData(
          assistantConversationsQueryKey(workspaceSlug),
          typedContext.previousConversations
        );
      }

      irminAlert('error', error.message ?? 'Error sending message');
    },
  });

  return {
    // Queries
    assistantConversationQuery,

    // Mutations
    deleteAssistantConversationMutation,
    updateAssistantConversationMutation,
    clearAssistantConversationMutation,
    sendMessageMutation,

    // Handlers
    handleDeleteConversation,
  };
}
