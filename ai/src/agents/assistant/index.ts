import { toolCatalog } from '@/agent-runtime/toolCatalog';
import { inferenceGateway, type ModelRole } from '@/inference';
import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
  summarizationMiddleware,
} from 'langchain';

import agentService from '@/services/agent';
import { toolCacheService } from '@/services/toolCache';

import { BaseAgent } from '@/agents/base';
import {
  createDuckDbHydeSearchTool,
  createHydeSearchTool,
} from '@/agents/tools/hydeSearchTool';
import {
  createBatchContextTool,
  createLazyContextTool,
} from '@/agents/tools/lazyContextTool';
import { createQueryAssistantTool } from '@/agents/tools/queryAssistantTool';
import { createScriptingAssistantTool } from '@/agents/tools/scriptingAssistantTool';
import type { AgentInput, AgentResponse } from '@/agents/types';

import { agentConfig } from './config';

export class AssistantAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  // Core tools that should always be included by the LLM tool selector
  // Maximum tools for LLM selector (keeps context manageable)
  private static readonly MAX_SELECTED_TOOLS = 14;

  protected async getAgentOptions(input: AgentInput): Promise<{
    modelRole: ModelRole;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    const optionsStart = Date.now();

    // Get MCP tools from cache (1-minute TTL per auth token)
    // This saves 100-300ms on cache hits vs fetching fresh tools
    let tools: DynamicStructuredTool[] = [];
    if (input.authToken && input.workspace) {
      const toolsStart = Date.now();
      tools = await toolCacheService.getTools(
        input.authToken,
        input.workspace.slug
      );
      console.log(
        `[Agent Timing] MCP tools loaded: ${Date.now() - toolsStart}ms (${tools.length} tools)`
      );
    }

    // Add HyDE search tools for enhanced retrieval when needed
    // These allow the agent to get higher quality search results on demand
    tools.push(createHydeSearchTool('irmin-docs'));
    tools.push(createDuckDbHydeSearchTool());

    // Add lazy context tools for on-demand Irmin API data fetching
    // Only add these if we're not in docs-only mode
    if (input.authToken && input.workspace?.slug) {
      tools.push(createLazyContextTool(input.authToken, input.workspace.slug));
      tools.push(createBatchContextTool(input.authToken, input.workspace.slug));
    }

    // Delegate SQL authoring and Go script authoring to dedicated sub-agents
    // rather than producing them inline. The assistant routes any non-trivial
    // SQL or scripting work through these tools so users get expert-quality
    // output without the assistant having to specialize.
    if (input.authToken && input.workspace && input.user) {
      tools.push(
        createQueryAssistantTool(input.authToken, input.workspace, input.user)
      );
      tools.push(
        createScriptingAssistantTool(
          input.authToken,
          input.workspace,
          input.user
        )
      );
    }

    const inferenceContext = {
      workspaceSlug: input.workspace?.slug,
      conversationId: input.conversationId,
      userId: input.user?.id,
    };
    const summarizerModel = inferenceGateway.modelFor(
      'summarizer',
      inferenceContext
    );
    const selectorModel = inferenceGateway.modelFor(
      'tool_selector',
      inferenceContext
    );

    const middleware: AgentMiddleware[] = [
      summarizationMiddleware({
        model: summarizerModel,
        trigger: [
          { tokens: 5000, messages: 3 },
          { tokens: 3000, messages: 6 },
        ],
        keep: { messages: 20 },
      }),
    ];

    middleware.push(
      llmToolSelectorMiddleware({
        model: selectorModel,
        maxTools: AssistantAgent.MAX_SELECTED_TOOLS,
        alwaysInclude: toolCatalog.namesFor(tools, [
          'documentation.retrieve',
          'repository.read',
          'query.execute',
          'query.author',
          'script.author',
        ]),
      })
    );

    console.log(
      `[Agent Timing] getAgentOptions total: ${Date.now() - optionsStart}ms (tools=${tools.length}, middleware=${middleware.length})`
    );

    return {
      modelRole: 'assistant',
      tools,
      middleware,
    };
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
      conversationId,
      input.signal
    );

    // Return streaming response
    return {
      stream,
    };
  }
}
