import type IrminCore from '@/lib/core';

import type {
  AIApplication,
  AIApplicationDataSource,
  AIApplicationPendingWrite,
  AIApplicationPendingWritesResponse,
  AIApplicationToolConfig,
  AIApplicationToolLogsResponse,
  AIApplicationToolLogStats,
  CreateAIApplicationRequest,
  TransferAIApplicationOwnershipRequest,
  UpdateAIApplicationRequest,
  UpdateCustomToolRequest,
} from '@/types/core/AIApplication';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * AI Application service
 *
 * Provides methods to interact with the AI Applications API.
 */
class AIApplicationService {
  private irminCore: IrminCore;

  /**
   * Create a new AIApplicationService.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listAIApplications = this.listAIApplications.bind(this);
    this.getAIApplication = this.getAIApplication.bind(this);
    this.createAIApplication = this.createAIApplication.bind(this);
    this.updateAIApplication = this.updateAIApplication.bind(this);
    this.deleteAIApplication = this.deleteAIApplication.bind(this);
    this.transferAIApplication = this.transferAIApplication.bind(this);
    this.getSystemPrompt = this.getSystemPrompt.bind(this);
    this.getToolLogs = this.getToolLogs.bind(this);
    this.getToolLogStats = this.getToolLogStats.bind(this);
    this.getPendingWrites = this.getPendingWrites.bind(this);
    this.approvePendingWrite = this.approvePendingWrite.bind(this);
    this.rejectPendingWrite = this.rejectPendingWrite.bind(this);
  }

  /**
   * List all AI Applications in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of AIApplication.
   */
  async listAIApplications({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<AIApplication[]>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<AIApplication[]>;
    } catch (error) {
      console.error('List AI Applications error', error);
      throw error;
    }
  }

  /**
   * Get a specific AI Application by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @returns IrminAPIResponse containing an AIApplication.
   */
  async getAIApplication({
    workspace,
    aiApplicationId,
  }: {
    workspace: string;
    aiApplicationId: string;
  }): Promise<IrminAPIResponse<AIApplication>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<AIApplication>;
    } catch (error) {
      console.error('Get AI Application error', error);
      throw error;
    }
  }

  /**
   * Create a new AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.name - The AI Application name.
   * @param props.description - The AI Application description.
   * @param props.documentation - The AI Application documentation.
   * @param props.allowedOrigins - The allowed origins for CORS.
   * @param props.tools - The tool configuration.
   * @param props.dataSources - The data sources.
   * @param props.tags - The tag IDs.
   * @returns IrminAPIResponse containing the created AIApplication.
   */
  async createAIApplication({
    workspace,
    name,
    description,
    documentation,
    allowedOrigins,
    tools,
    dataSources,
    tags,
  }: {
    workspace: string;
    name: string;
    description?: string;
    documentation?: string;
    allowedOrigins?: string[];
    tools?: AIApplicationToolConfig;
    dataSources?: AIApplicationDataSource[];
    tags?: string[];
  }): Promise<IrminAPIResponse<AIApplication>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications`;
      const requestBody: CreateAIApplicationRequest = {
        name,
        description,
        documentation,
        allowed_origins: allowedOrigins,
        tools,
        data_sources: dataSources,
        tags,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<AIApplication>;
    } catch (error) {
      console.error('Create AI Application error', error);
      throw error;
    }
  }

  /**
   * Update an existing AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.name - The updated name.
   * @param props.description - The updated description.
   * @param props.documentation - The updated documentation.
   * @param props.allowedOrigins - The updated allowed origins.
   * @param props.tools - The updated tool configuration.
   * @param props.customTools - The updated custom tools.
   * @param props.dataSources - The updated data sources.
   * @param props.tags - The updated tag IDs.
   * @returns IrminAPIResponse containing the updated AIApplication.
   */
  async updateAIApplication({
    workspace,
    aiApplicationId,
    name,
    description,
    documentation,
    allowedOrigins,
    tools,
    customTools,
    dataSources,
    tags,
  }: {
    workspace: string;
    aiApplicationId: string;
    name?: string;
    description?: string;
    documentation?: string;
    allowedOrigins?: string[];
    tools?: AIApplicationToolConfig;
    customTools?: UpdateCustomToolRequest[];
    dataSources?: AIApplicationDataSource[];
    tags?: string[];
  }): Promise<IrminAPIResponse<AIApplication>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}`;
      const requestBody: UpdateAIApplicationRequest = {
        name,
        description,
        documentation,
        allowed_origins: allowedOrigins,
        tools,
        custom_tools: customTools,
        data_sources: dataSources,
        tags,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<AIApplication>;
    } catch (error) {
      console.error('Update AI Application error', error);
      throw error;
    }
  }

  /**
   * Delete an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @returns IrminAPIResponse with the result of the deletion.
   */
  async deleteAIApplication({
    workspace,
    aiApplicationId,
  }: {
    workspace: string;
    aiApplicationId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Delete AI Application error', error);
      throw error;
    }
  }

  /**
   * Transfer AI Application ownership to another user.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.newOwnerId - The new owner's user ID.
   * @returns IrminAPIResponse containing the updated AIApplication.
   */
  async transferAIApplication({
    workspace,
    aiApplicationId,
    newOwnerId,
  }: {
    workspace: string;
    aiApplicationId: string;
    newOwnerId: string;
  }): Promise<IrminAPIResponse<AIApplication>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/transfer-ownership`;
      const requestBody: TransferAIApplicationOwnershipRequest = {
        new_owner_id: newOwnerId,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<AIApplication>;
    } catch (error) {
      console.error('Transfer AI Application error', error);
      throw error;
    }
  }

  /**
   * Get the recommended system prompt for an AI Application.
   * This endpoint uses the AI Application API key for authentication.
   *
   * @param props - The parameters.
   * @param props.apiKey - The AI Application API key.
   * @returns IrminAPIResponse containing the system prompt.
   */
  async getSystemPrompt({
    apiKey,
  }: {
    apiKey: string;
  }): Promise<IrminAPIResponse<{ system_prompt: string }>> {
    try {
      const endpoint = '/v1/ai-app/system-prompt';
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response as IrminAPIResponse<{ system_prompt: string }>;
    } catch (error) {
      console.error('Get system prompt error', error);
      throw error;
    }
  }

  /**
   * Get tool logs for an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.limit - Maximum number of logs to return (default 50).
   * @param props.offset - Number of logs to skip (default 0).
   * @param props.toolName - Filter by tool name.
   * @param props.success - Filter by success status.
   * @returns IrminAPIResponse containing tool logs.
   */
  async getToolLogs({
    workspace,
    aiApplicationId,
    limit = 50,
    offset = 0,
    toolName,
    success,
  }: {
    workspace: string;
    aiApplicationId: string;
    limit?: number;
    offset?: number;
    toolName?: string;
    success?: boolean;
  }): Promise<IrminAPIResponse<AIApplicationToolLogsResponse>> {
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());
      if (toolName) {
        params.set('tool_name', toolName);
      }
      if (success !== undefined) {
        params.set('success', success.toString());
      }

      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/tool-logs?${params.toString()}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<AIApplicationToolLogsResponse>;
    } catch (error) {
      console.error('Get AI Application tool logs error', error);
      throw error;
    }
  }

  /**
   * Get tool log statistics for an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @returns IrminAPIResponse containing tool log statistics.
   */
  async getToolLogStats({
    workspace,
    aiApplicationId,
  }: {
    workspace: string;
    aiApplicationId: string;
  }): Promise<IrminAPIResponse<AIApplicationToolLogStats>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/tool-logs/stats`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<AIApplicationToolLogStats>;
    } catch (error) {
      console.error('Get AI Application tool log stats error', error);
      throw error;
    }
  }

  /**
   * Get pending writes for an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.limit - Maximum number of pending writes to return (default 50).
   * @param props.offset - Number of pending writes to skip (default 0).
   * @returns IrminAPIResponse containing pending writes.
   */
  async getPendingWrites({
    workspace,
    aiApplicationId,
    limit = 50,
    offset = 0,
  }: {
    workspace: string;
    aiApplicationId: string;
    limit?: number;
    offset?: number;
  }): Promise<IrminAPIResponse<AIApplicationPendingWritesResponse>> {
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/pending-writes?${params.toString()}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<AIApplicationPendingWritesResponse>;
    } catch (error) {
      console.error('Get AI Application pending writes error', error);
      throw error;
    }
  }

  /**
   * Approve a pending write for an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.pendingWriteId - The pending write ID.
   * @returns IrminAPIResponse with the approval result.
   */
  async approvePendingWrite({
    workspace,
    aiApplicationId,
    pendingWriteId,
  }: {
    workspace: string;
    aiApplicationId: string;
    pendingWriteId: string;
  }): Promise<IrminAPIResponse<AIApplicationPendingWrite>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/pending-writes/${pendingWriteId}/approve`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<AIApplicationPendingWrite>;
    } catch (error) {
      console.error('Approve pending write error', error);
      throw error;
    }
  }

  /**
   * Reject a pending write for an AI Application.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.aiApplicationId - The AI Application ID.
   * @param props.pendingWriteId - The pending write ID.
   * @returns IrminAPIResponse with the rejection result.
   */
  async rejectPendingWrite({
    workspace,
    aiApplicationId,
    pendingWriteId,
  }: {
    workspace: string;
    aiApplicationId: string;
    pendingWriteId: string;
  }): Promise<IrminAPIResponse<AIApplicationPendingWrite>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/ai-applications/${aiApplicationId}/pending-writes/${pendingWriteId}/reject`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<AIApplicationPendingWrite>;
    } catch (error) {
      console.error('Reject pending write error', error);
      throw error;
    }
  }
}

export default AIApplicationService;
