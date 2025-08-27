import type IrminCore from '@/lib/core';

import type {
  AssistantConversation,
  AssistantConversationStats,
  AssistantMessage,
} from '@/types/core/Assistant';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for creating a new assistant message
 */
interface CreateAssistantMessageRequest {
  message: string;
}

/**
 * Interface for creating a new assistant conversation
 */
interface CreateAssistantConversationRequest {
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for updating an assistant conversation
 */
interface UpdateAssistantConversationRequest {
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Assistant API service
 *
 * Provides methods to interact with assistant endpoints.
 */
class AssistantService {
  private irminCore: IrminCore;

  /**
   * Create a new AssistantService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listConversations = this.listConversations.bind(this);
    this.getConversation = this.getConversation.bind(this);
    this.createConversation = this.createConversation.bind(this);
    this.updateConversation = this.updateConversation.bind(this);
    this.deleteConversation = this.deleteConversation.bind(this);
    this.clearConversation = this.clearConversation.bind(this);
    this.getConversationStats = this.getConversationStats.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }

  /**
   * List all assistant conversations for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch conversations from.
   * @returns IrminAPIResponse containing an array of AssistantConversation.
   */
  async listConversations({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<AssistantConversation[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations`,
        { method: 'GET' }
      )) as IrminAPIResponse<AssistantConversation[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'List assistant conversations error'
      );
      throw error;
    }
  }

  /**
   * Get a specific assistant conversation by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch the conversation from.
   * @param props.conversationID - The ID of the conversation to fetch.
   * @returns IrminAPIResponse containing the AssistantConversation.
   */
  async getConversation({
    workspace,
    conversationID,
  }: {
    workspace: string;
    conversationID: string;
  }): Promise<IrminAPIResponse<AssistantConversation>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}`,
        { method: 'GET' }
      )) as IrminAPIResponse<AssistantConversation>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Get assistant conversation error'
      );
      throw error;
    }
  }

  /**
   * Create a new assistant conversation.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.title - The conversation title.
   * @param props.metadata - Optional metadata for the conversation.
   * @returns IrminAPIResponse containing the new AssistantConversation.
   */
  async createConversation({
    workspace,
    title,
    metadata,
  }: {
    workspace: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IrminAPIResponse<AssistantConversation>> {
    try {
      const requestBody: CreateAssistantConversationRequest = {
        title,
        metadata,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<AssistantConversation>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Create assistant conversation error'
      );
      throw error;
    }
  }

  /**
   * Update an existing assistant conversation.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.conversationID - The conversation's identifier.
   * @param props.title - The conversation title.
   * @param props.metadata - Optional metadata for the conversation.
   * @returns IrminAPIResponse containing the result of the update.
   */
  async updateConversation({
    workspace,
    conversationID,
    title,
    metadata,
  }: {
    workspace: string;
    conversationID: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IrminAPIResponse> {
    try {
      const requestBody: UpdateAssistantConversationRequest = {};

      if (title !== undefined) requestBody.title = title;
      if (metadata !== undefined) requestBody.metadata = metadata;

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update assistant conversation error'
      );
      throw error;
    }
  }

  /**
   * Delete an assistant conversation.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.conversationID - The conversation's identifier.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteConversation({
    workspace,
    conversationID,
  }: {
    workspace: string;
    conversationID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Delete assistant conversation error'
      );
      throw error;
    }
  }

  /**
   * Clear all messages from an assistant conversation.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.conversationID - The conversation's identifier.
   * @returns IrminAPIResponse containing the result of the clear operation.
   */
  async clearConversation({
    workspace,
    conversationID,
  }: {
    workspace: string;
    conversationID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}/clear`,
        { method: 'POST' }
      );
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Clear assistant conversation error'
      );
      throw error;
    }
  }

  /**
   * Get statistics for an assistant conversation.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.conversationID - The conversation's identifier.
   * @returns IrminAPIResponse containing conversation statistics.
   */
  async getConversationStats({
    workspace,
    conversationID,
  }: {
    workspace: string;
    conversationID: string;
  }): Promise<IrminAPIResponse<AssistantConversationStats>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}/stats`,
        { method: 'GET' }
      )) as IrminAPIResponse<AssistantConversationStats>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Get assistant conversation stats error'
      );
      throw error;
    }
  }

  /**
   * Send a message to the AI assistant and get a response.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.conversationID - The conversation's identifier.
   * @param props.message - The message to send to the assistant.
   * @returns IrminAPIResponse containing an array of AssistantMessage responses.
   */
  async sendMessage({
    workspace,
    conversationID,
    message,
  }: {
    workspace: string;
    conversationID: string;
    message: string;
  }): Promise<IrminAPIResponse<AssistantMessage[]>> {
    try {
      const requestBody: CreateAssistantMessageRequest = {
        message,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/conversations/${conversationID}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<AssistantMessage[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Send assistant message error');
      throw error;
    }
  }
}

export default AssistantService;
