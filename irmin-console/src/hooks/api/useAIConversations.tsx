import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminAIClient from '@/lib/ai';
import { aiConversationsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIConversation } from '@/types/ai/base';
import type { AICreateConversationRequest } from '@/types/ai/requests';
import type { AIConversationsListResponse } from '@/types/ai/responses';

type AIConversationInput = {
  title?: string;
  metadata?: Record<string, unknown>;
  agentId?: string;
};

interface UseAIConversationsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  agentId?: string;
}

export function useAIConversations(options: UseAIConversationsOptions = {}) {
  const { getToken } = useIAM();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(options.page || 1);
  const [pageLimit] = useState(options.limit || 20);

  // Query for fetching AI conversations in the current workspace with pagination
  const aiConversationsQuery = useQuery<AIConversationsListResponse>({
    queryKey: aiConversationsQueryKey(workspaceSlug, {
      page: currentPage,
      limit: pageLimit,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      agentId: options.agentId,
    }),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const conversations = await client.conversations.listConversations({
        page: currentPage,
        limit: pageLimit,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        agentId: options.agentId,
      });
      return conversations;
    },
  });

  // Mutation for creating a new agent conversation
  const createAIConversationMutation = useMutation<
    AIConversation,
    Error,
    AIConversationInput
  >({
    mutationFn: async (input: AIConversationInput) => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);

      const request: AICreateConversationRequest = {
        title: input.title,
        metadata: input.metadata,
        agentId: input.agentId,
      };

      const newConversation =
        await client.conversations.createConversation(request);
      return newConversation;
    },
    onMutate: async (input: AIConversationInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: aiConversationsQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousConversations =
        queryClient.getQueryData<AIConversationsListResponse>(
          aiConversationsQueryKey(workspaceSlug, {
            page: currentPage,
            limit: pageLimit,
            sortBy: options.sortBy,
            sortOrder: options.sortOrder,
            agentId: options.agentId,
          })
        );

      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const title = `untitled - ${timestamp}`;

      // Optimistically update the cache
      const optimisticConversation: AIConversation = {
        id: `temp-${Date.now()}`,
        title: input.title || title,
        workspaceSlug: workspaceSlug,
        userId: 'temp-user-id',
        metadata: input.metadata || {},
        agentId: input.agentId || null,
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<AIConversationsListResponse>(
        aiConversationsQueryKey(workspaceSlug, {
          page: currentPage,
          limit: pageLimit,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          agentId: options.agentId,
        }),
        (old) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: [...old.data, optimisticConversation],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        }
      );

      // Return context for rollback
      return { previousConversations };
    },
    onError: (error, _input, context: unknown) => {
      // Rollback on error
      const typedContext = context as
        | { previousConversations?: AIConversationsListResponse }
        | undefined;

      if (typedContext?.previousConversations) {
        queryClient.setQueryData(
          aiConversationsQueryKey(workspaceSlug, {
            page: currentPage,
            limit: pageLimit,
            sortBy: options.sortBy,
            sortOrder: options.sortOrder,
            agentId: options.agentId,
          }),
          typedContext.previousConversations
        );
      }
      irminAlert('error', error.message ?? 'Failed to create conversation');
    },
    onSuccess: (newConversation, _input) => {
      // Update cache with real data from server
      queryClient.setQueryData<AIConversationsListResponse>(
        aiConversationsQueryKey(workspaceSlug, {
          page: currentPage,
          limit: pageLimit,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          agentId: options.agentId,
        }),
        (old) => {
          if (!old?.data) return old;

          // Replace the optimistic item with the real one
          const updatedConversations = old.data.map((conversation) =>
            conversation.id.startsWith('temp-') ? newConversation : conversation
          );

          return {
            ...old,
            data: updatedConversations,
          };
        }
      );

      irminAlert('success', 'Conversation created successfully');
    },
  });

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    const pagination = aiConversationsQuery.data?.pagination;
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return {
    // Queries
    aiConversationsQuery,

    // Mutations
    createAIConversationMutation,

    // Pagination
    currentPage,
    pagination: aiConversationsQuery.data?.pagination,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: aiConversationsQuery.data?.pagination
      ? currentPage < aiConversationsQuery.data.pagination.totalPages
      : false,
    hasPreviousPage: currentPage > 1,
  };
}
