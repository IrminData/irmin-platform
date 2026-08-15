import { specialistRunner } from '@/agent-runtime/specialistRunner';
import { toolCatalog } from '@/agent-runtime/toolCatalog';
import { inferenceGateway, type ModelRole } from '@/inference';
import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
} from 'langchain';

import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import { createQueryAssistantTool } from '@/agents/tools/queryAssistantTool';
import type { AgentInput, AgentResponse } from '@/agents/types';

import { agentConfig } from './config';

export class ScriptingAgent extends BaseAgent {
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
    if (input.authToken && input.workspace) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient(
        {
          ...mcpConfig,
        },
        input.workspace.slug
      );
      const mcpTools = await toolsService.getTools(mcpClient);

      const filteredTools = toolCatalog.select(mcpTools, [
        'script.read',
        'script.write',
        'script.execute',
        'repository.read',
        'workflow.read',
        'documentation.retrieve',
      ]);
      tools.push(...filteredTools);

      // Delegate SQL authoring to the dedicated query agent rather than
      // guessing DuckDB syntax. Workspace + user must be present — the
      // route handler always provides them for authenticated requests.
      if (input.workspace && input.user) {
        tools.push(
          createQueryAssistantTool(input.authToken, input.workspace, input.user)
        );
      }
    }

    const selectorModel = inferenceGateway.modelFor('tool_selector', {
      workspaceSlug: input.workspace?.slug,
      conversationId: input.conversationId,
      userId: input.user?.id,
    });

    return {
      modelRole: 'scripting',
      tools,
      middleware: [
        llmToolSelectorMiddleware({
          model: selectorModel,
          maxTools: 10,
          alwaysInclude: toolCatalog.namesFor(tools, [
            'documentation.retrieve',
            'query.author',
          ]),
        }),
      ],
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
      specialistResult: await specialistRunner.acceptGo(response),
    };
  }
}
