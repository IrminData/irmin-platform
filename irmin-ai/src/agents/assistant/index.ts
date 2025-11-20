import { indexingService, retrievalService } from '@/vector';
import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
  modelFallbackMiddleware,
  summarizationMiddleware,
} from 'langchain';

import agentService from '@/services/agent';
import { LLMOptions, llmService } from '@/services/llm';
import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import type { AgentInput, AgentResponse } from '@/agents/types';

import { agentConfig } from './config';

export class AssistantAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions(input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Create MCP tools with auth token
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient({
        // Add MCP servers here...
        ...mcpConfig,
      });
      const mcpTools = await toolsService.getTools(mcpClient);
      tools.push(...mcpTools);
    }

    const fallbackLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5',
      temperature: 0.8,
      maxTokens: 16000,
      streaming: true,
    });

    const cheaperLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5-mini',
      temperature: 1,
      streaming: false,
    });

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.8,
        maxTokens: 4096,
        streaming: true,
        anthropic: {
          thinking: {
            budget_tokens: 1024,
            type: 'enabled',
          },
        },
      },
      tools,
      middleware: [
        summarizationMiddleware({
          model: cheaperLLM,
          trigger: [
            { tokens: 5000, messages: 3 },
            { tokens: 3000, messages: 6 },
          ],
          keep: { messages: 20 },
        }),
        llmToolSelectorMiddleware({
          model: cheaperLLM,
          maxTools: 10,
          alwaysInclude: [
            'retrieve_docs_context',
            'get_repository_object_schema',
            'get_connection_schema',
          ],
        }),
        modelFallbackMiddleware(fallbackLLM),
      ],
    };
  }

  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    const context = await super.prepareContext(input);

    // Fetch documentation from vector store
    try {
      const vectorStore = await indexingService.initVectorStore(
        'irmin-docs',
        true
      );

      const docsResult = await retrievalService.retrieveWithHypotheticalContent(
        vectorStore,
        input.message,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 3000,
        },
        'irmin-docs'
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.irmin_documentation = docsResult.context;
      }
    } catch (error) {
      console.warn('Failed to retrieve documentation context:', error);
    }

    return context;
  }

  /**
   * Override execute to enable streaming
   */
  async execute(
    input: AgentInput,
    conversationId: string
  ): Promise<AgentResponse> {
    // Create the agent
    const agent = await this.createAgent(input, conversationId);

    // Stream agent response
    const stream = await agentService.streamAgent(
      agent,
      input.message,
      conversationId
    );

    // Return streaming response
    return {
      stream,
    };
  }
}
