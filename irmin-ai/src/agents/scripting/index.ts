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
    // Create MCP tools with auth token - load all tools (full Irmin MCP)
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient({
        ...mcpConfig,
      });
      const mcpTools = await toolsService.getTools(mcpClient);
      tools.push(...mcpTools);
    }

    const fallbackLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5',
      temperature: 0.8,
      maxTokens: 2000,
      streaming: false,
    });

    const cheaperLLM = llmService.createLLM({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
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
