import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
  modelFallbackMiddleware,
} from 'langchain';

import { LLMOptions, llmService } from '@/services/llm';
import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import type { AgentInput } from '@/agents/types';

import { ANTHROPIC_FALLBACK_CHAIN } from '@/config/models';

import { agentConfig } from './config';

export class ScriptingAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions(input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Create MCP tools with auth token and filter to only include the required tools
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient({
        ...mcpConfig,
      });
      const mcpTools = await toolsService.getTools(mcpClient);

      // Only include the necessary tools
      const requiredToolNames = [
        'irmin_list_scripts',
        'irmin_get_script_content',
        'irmin_create_script',
        'irmin_update_script',
        'irmin_execute_script',
        'irmin_list_repositories',
        'irmin_get_repository',
        'irmin_list_repository_objects',
        'irmin_get_repository_object_schema',
        'irmin_list_repository_branches',
        'irmin_list_repository_tags',
        'irmin_list_repository_commits',
        'irmin_list_workflows',
        'irmin_get_workflow',
        'irmin_retrieve_docs_context',
      ];
      const filteredTools = mcpTools.filter((tool) =>
        requiredToolNames.includes(tool.name)
      );
      tools.push(...filteredTools);
    }

    // Fallbacks must stay on Anthropic because the primary emits thinking
    // blocks — switching providers mid-conversation corrupts message history.
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
      model: 'llama-3.1-8b-instant',
      streaming: false,
    });

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-6',
        temperature: 0.8,
        maxTokens: 2000,
        streaming: false,
        anthropic: {
          thinking: {
            budget_tokens: 1024,
            type: 'enabled',
          },
        },
      },
      tools,
      middleware: [
        llmToolSelectorMiddleware({
          model: cheaperLLM,
          maxTools: 10,
          alwaysInclude: ['irmin_retrieve_docs_context'],
        }),
        modelFallbackMiddleware(...fallbackLLMs),
      ],
    };
  }

  // Uses base execute() - non-streaming
}
