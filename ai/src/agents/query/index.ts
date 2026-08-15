import { specialistRunner } from '@/agent-runtime/specialistRunner';
import { toolCatalog } from '@/agent-runtime/toolCatalog';
import type { ModelRole } from '@/inference';
import { AgentMiddleware, DynamicStructuredTool } from 'langchain';

import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import type { AgentInput, AgentResponse } from '@/agents/types';

import { agentConfig } from './config';

export class QueryAgent extends BaseAgent {
  protected override executionRole: ModelRole = 'query';
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions(input: AgentInput): Promise<{
    modelRole: ModelRole;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Create MCP tools with auth token and filter to only include the required tools
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(
        input.authToken,
        input.workspace.slug
      );
      const mcpClient = toolsService.createClient(
        {
          // Add MCP servers here...
          ...mcpConfig,
        },
        input.workspace.slug
      );
      const mcpTools = await toolsService.getTools(mcpClient);

      const filteredTools = toolCatalog.select(mcpTools, [
        'repository.read',
        'documentation.retrieve',
        'query.execute',
      ]);
      tools.push(...filteredTools);
    }

    return {
      modelRole: 'query',
      tools,
      middleware: [],
    };
  }

  // Uses base execute() - non-streaming
  override async execute(
    input: AgentInput,
    conversationId: string
  ): Promise<AgentResponse> {
    const response = await super.execute(input, conversationId);
    return {
      ...response,
      specialistResult: specialistRunner.acceptSql(response),
    };
  }
}
