import type IrminCore from '@/lib/core';

import type {
  AIApplication,
  AIApplicationDataSource,
  AIApplicationToolConfig,
  CreateAIApplicationRequest,
  TransferAIApplicationOwnershipRequest,
  UpdateAIApplicationRequest,
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
}

export default AIApplicationService;
