import type { StoredMessage } from '@langchain/core/messages';

import { AIConversationSchema, AIErrorSchema } from '@/types/ai/base';
import {
  AICreateConversationRequest,
  AICreateConversationRequestSchema,
  AIUpdateConversationRequest,
  AIUpdateConversationRequestSchema,
} from '@/types/ai/requests';
import { AIConversationsListResponseSchema } from '@/types/ai/responses';

import { BaseClient } from './BaseClient';

interface ListConversationsParams {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  agentId?: string;
}

export class ConversationsClient extends BaseClient {
  async listConversations(params: ListConversationsParams = {}) {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.agentId !== undefined)
      searchParams.set('agentId', params.agentId);

    const response = await fetch(
      `${this.baseUrl}/api/conversations?${searchParams}`,
      {
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse(response, AIConversationsListResponseSchema);
  }

  async createConversation(request: AICreateConversationRequest = {}) {
    const validatedRequest = AICreateConversationRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/api/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validatedRequest),
    });

    return this.handleResponse(response, AIConversationSchema);
  }

  async getConversation(id: string) {
    const url = `${this.baseUrl}/api/conversations/${id}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
      }

      return await this.handleResponse(response, AIConversationSchema);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Request timeout: Conversation ${id} took too long to fetch`
        );
      }

      throw error;
    }
  }

  async updateConversation(id: string, request: AIUpdateConversationRequest) {
    const validatedRequest = AIUpdateConversationRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/api/conversations/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(validatedRequest),
    });

    return this.handleResponse(response, AIConversationSchema);
  }

  async deleteConversation(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/conversations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleDeleteResponse(response);
  }

  async getConversationMessages(id: string): Promise<StoredMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/api/conversations/${id}/messages`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = AIErrorSchema.safeParse(errorData);

      if (error.success) {
        throw new Error(
          `API Error ${error.data.statusCode}: ${error.data.message}`
        );
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    // AI service returns raw array of serialized LangChain messages (StoredMessage[])
    const messages = (await response.json()) as StoredMessage[];
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages;
  }
}
