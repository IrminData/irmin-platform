import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
  modelFallbackMiddleware,
  summarizationMiddleware,
} from 'langchain';

import agentService from '@/services/agent';
import { LLMOptions, llmService } from '@/services/llm';
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

import { ANTHROPIC_FALLBACK_CHAIN } from '@/config/models';

import { agentConfig } from './config';

export class AssistantAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  // Core tools that should always be included by the LLM tool selector
  private static readonly ALWAYS_INCLUDE_TOOLS = [
    'irmin_retrieve_docs_context',
    'irmin_list_repositories',
    'irmin_execute_sql',
    'query_sql_assistant',
    'scripting_assistant',
  ];

  // Maximum tools for LLM selector (keeps context manageable)
  private static readonly MAX_SELECTED_TOOLS = 14;

  // Patterns that indicate a docs-only query (no tools needed beyond docs retrieval)
  // NOTE: Be careful not to match queries about user data (e.g., "What connections do I have?")
  private static readonly DOCS_ONLY_PATTERNS = [
    /^(what|who|when|where|why|how)\s+(is|are|does|do|can|should|would|could)\s+(irmin|a|an|the)/i,
    /^(explain|describe|tell me about|define|clarify)\s+(irmin|what|how|the)/i,
    /^(help me understand|i want to learn|teach me)/i,
  ];

  // Patterns that indicate tools are needed (actions, data operations, user data queries)
  private static readonly NEEDS_TOOLS_PATTERNS = [
    /\b(list|show|get|fetch|find|search|query|execute|run|create|update|delete|insert)\b/i,
    /\b(my|our)\s+(repositor(y|ies)|connections?|workflows?|data|tables?)/i,
    /\bdo\s+I\s+have\b/i, // "What connections do I have?"
    /\b(sql|duckdb|database)\b/i,
    /\b(repositor(y|ies)|branch(es)?|commits?|objects?|schemas?|connections?|workflows?)\b/i,
    /\bscript(s|ing)?\b/i,
    /\b(golang)\b|\bgo\s+(script|code|program|sdk)\b/i,
    /\bwrite\b.*\bscript\b/i,
  ];

  /**
   * Determine if a query is a simple docs-only question.
   * Returns true if we can skip the LLM tool selector and just use docs retrieval.
   */
  private isDocsOnlyQuery(message: string): boolean {
    const trimmed = message.trim();

    // If message explicitly needs tools, return false
    for (const pattern of AssistantAgent.NEEDS_TOOLS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    // If message matches docs-only patterns, return true
    for (const pattern of AssistantAgent.DOCS_ONLY_PATTERNS) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    // Default: assume tools might be needed
    return false;
  }

  protected async getAgentOptions(input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    const optionsStart = Date.now();

    // Check if this is a simple docs-only query (skip expensive tool selection)
    const docsOnly = this.isDocsOnlyQuery(input.message);
    console.log(
      `[Agent Timing] docsOnly=${docsOnly} for query: "${input.message.slice(0, 50)}..."`
    );

    // Get MCP tools from cache (1-minute TTL per auth token)
    // This saves 100-300ms on cache hits vs fetching fresh tools
    let tools: DynamicStructuredTool[] = [];
    if (!docsOnly && input.authToken) {
      const toolsStart = Date.now();
      tools = await toolCacheService.getTools(input.authToken);
      console.log(
        `[Agent Timing] MCP tools loaded: ${Date.now() - toolsStart}ms (${tools.length} tools)`
      );
    } else {
      console.log('[Agent Timing] Skipping MCP tools (docsOnly mode)');
    }

    // Add HyDE search tools for enhanced retrieval when needed
    // These allow the agent to get higher quality search results on demand
    tools.push(createHydeSearchTool('irmin-docs'));
    tools.push(createDuckDbHydeSearchTool());

    // Add lazy context tools for on-demand Irmin API data fetching
    // Only add these if we're not in docs-only mode
    if (!docsOnly && input.authToken && input.workspace?.slug) {
      tools.push(createLazyContextTool(input.authToken, input.workspace.slug));
      tools.push(createBatchContextTool(input.authToken, input.workspace.slug));
    }

    // Delegate SQL authoring and Go script authoring to dedicated sub-agents
    // rather than producing them inline. The assistant routes any non-trivial
    // SQL or scripting work through these tools so users get expert-quality
    // output without the assistant having to specialize.
    if (!docsOnly && input.authToken && input.workspace && input.user) {
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

    // Fallbacks must stay on Anthropic because the primary emits thinking
    // blocks — switching providers mid-conversation corrupts message history.
    // Order: cheaper+faster first (Haiku), then a stable older Sonnet as a
    // last resort if Haiku also fails.
    const fallbackLLMs = ANTHROPIC_FALLBACK_CHAIN.map((model) =>
      llmService.createLLM({
        provider: 'anthropic',
        model,
        maxTokens: 1000,
        streaming: false,
      })
    );

    const cheaperLLM = llmService.createLLM({
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      streaming: false,
    });

    // Build middleware array - skip tool selector for docs-only queries
    const middleware: AgentMiddleware[] = [
      summarizationMiddleware({
        model: cheaperLLM,
        trigger: [
          { tokens: 5000, messages: 3 },
          { tokens: 3000, messages: 6 },
        ],
        keep: { messages: 20 },
      }),
    ];

    // Only add tool selector middleware if this isn't a docs-only query
    if (!docsOnly) {
      middleware.push(
        llmToolSelectorMiddleware({
          model: cheaperLLM,
          maxTools: AssistantAgent.MAX_SELECTED_TOOLS,
          alwaysInclude: AssistantAgent.ALWAYS_INCLUDE_TOOLS,
        })
      );
      console.log('[Agent Timing] Tool selector middleware added');
    } else {
      console.log('[Agent Timing] Skipping tool selector (docsOnly mode)');
    }

    middleware.push(modelFallbackMiddleware(...fallbackLLMs));

    console.log(
      `[Agent Timing] getAgentOptions total: ${Date.now() - optionsStart}ms (tools=${tools.length}, middleware=${middleware.length})`
    );

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-6',
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
      conversationId
    );

    // Return streaming response
    return {
      stream,
    };
  }
}
