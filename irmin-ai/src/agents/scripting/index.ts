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
        'list_scripts',
        'get_script_content',
        'create_script',
        'update_script',
        'execute_script',
        'list_repositories',
        'get_repository',
        'list_repository_objects',
        'get_repository_object_schema',
        'list_repository_branches',
        'list_repository_tags',
        'list_repository_commits',
        'list_workflows',
        'get_workflow',
        'retrieve_docs_context',
      ];
      const filteredTools = mcpTools.filter((tool) =>
        requiredToolNames.includes(tool.name)
      );
      tools.push(...filteredTools);
    }

    const fallbackLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5.1',
      maxTokens: 1000,
      streaming: false,
      openai: {
        reasoning: {
          effort: 'high',
        },
      },
    });

    const cheaperLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5-mini',
      streaming: false,
    });

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
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
          alwaysInclude: ['retrieve_docs_context'],
        }),
        modelFallbackMiddleware(fallbackLLM),
      ],
    };
  }

  // Uses base execute() - non-streaming
}
