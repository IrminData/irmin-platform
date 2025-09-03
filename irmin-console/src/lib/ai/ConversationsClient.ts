import { AIConversationSchema } from '@/types/ai/base';
import {
  AICreateConversationRequest,
  AICreateConversationRequestSchema,
  AIUpdateConversationRequest,
  AIUpdateConversationRequestSchema,
} from '@/types/ai/requests';
import {
  AIConversationsListResponseSchema,
  AIMessagesListResponseSchema,
} from '@/types/ai/responses';

import { BaseClient } from './BaseClient';

interface ListConversationsParams {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  agentId?: string;
}

interface ListMessagesParams {
  sortOrder?: 'asc' | 'desc';
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
    const response = await fetch(`${this.baseUrl}/api/conversations/${id}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, AIConversationSchema);
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

  async getConversationMessages(id: string, params: ListMessagesParams = {}) {
    const searchParams = new URLSearchParams();

    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await fetch(
      `${this.baseUrl}/api/conversations/${id}/messages?${searchParams}`,
      {
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse(response, AIMessagesListResponseSchema);
  }

  async generateConversationTitle(id: string) {
    const response = await fetch(
      `${this.baseUrl}/api/conversations/${id}/generate-title`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse(response, AIConversationSchema);
  }
}
