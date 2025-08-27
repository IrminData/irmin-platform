import type IrminCore from '@/lib/core';

import type {
  AssistantConversation,
  AssistantMessage,
} from '@/types/core/Assistant';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for generating a script from natural language
 */
interface ScriptGenerationRequest {
  prompt: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Assistant Scripting API service
 *
 * Provides methods to interact with script generation endpoints.
 */
class AssistantScriptingService {
  private irminCore: IrminCore;

  /**
   * Create a new AssistantScriptingService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listConversations = this.listConversations.bind(this);
    this.generateScript = this.generateScript.bind(this);
  }

  /**
   * List all script generation conversations for a workspace.
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
        `/v1/workspaces/${workspace}/assistant/script`,
        { method: 'GET' }
      )) as IrminAPIResponse<AssistantConversation[]>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'List script generation conversations error'
      );
      throw error;
    }
  }

  /**
   * Generate a Go script from natural language using the ScriptingAI assistant.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.prompt - Natural language prompt describing the desired script.
   * @param props.conversationId - Optional conversation ID to continue an existing conversation.
   * @param props.metadata - Optional metadata for the request.
   * @returns IrminAPIResponse containing an array of AssistantMessage responses.
   */
  async generateScript({
    workspace,
    prompt,
    conversationId,
    metadata,
  }: {
    workspace: string;
    prompt: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IrminAPIResponse<AssistantMessage[]>> {
    try {
      const requestBody: ScriptGenerationRequest = {
        prompt,
        conversationId,
        metadata,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/assistant/script`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<AssistantMessage[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Generate script error');
      throw error;
    }
  }
}

export default AssistantScriptingService;
