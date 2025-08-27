import type IrminCore from '@/lib/core';

import type {
  AssistantConversation,
  AssistantMessage,
} from '@/types/core/Assistant';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for generating a query from natural language
 */
interface QueryGenerationRequest {
  prompt: string;
  repositorySlug?: string;
  repositoryRef?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Assistant Query API service
 *
 * Provides methods to interact with query generation endpoints.
 */
class AssistantQueryService {
  private irminCore: IrminCore;

  /**
   * Create a new AssistantQueryService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listConversations = this.listConversations.bind(this);
    this.generateQuery = this.generateQuery.bind(this);
  }

  /**
   * List all query generation conversations for a workspace.
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
        `/v1/workspaces/${workspace}/assistant/query`,
        { method: 'GET' }
      )) as IrminAPIResponse<AssistantConversation[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'List query generation conversations error'
      );
      throw error;
    }
  }

  /**
   * Generate a SQL query from natural language using the QueryAI assistant.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.prompt - Natural language prompt describing the desired query.
   * @param props.repositorySlug - Optional repository slug for repository-specific queries.
   * @param props.repositoryRef - Optional repository reference (branch, tag, commit).
   * @param props.conversationId - Optional conversation ID to continue an existing conversation.
   * @param props.metadata - Optional metadata for the request.
   * @returns IrminAPIResponse containing an array of AssistantMessage responses.
   */
  async generateQuery({
    workspace,
    prompt,
    repositorySlug,
    repositoryRef,
    conversationId,
    metadata,
  }: {
    workspace: string;
    prompt: string;
    repositorySlug?: string;
    repositoryRef?: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IrminAPIResponse<AssistantMessage[]>> {
    try {
      const requestBody: QueryGenerationRequest = {
        prompt,
        repositorySlug,
        repositoryRef,
        conversationId,
        metadata,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<AssistantMessage[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Generate query error');
      throw error;
    }
  }
}

export default AssistantQueryService;
