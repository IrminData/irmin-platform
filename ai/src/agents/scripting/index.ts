import { inferenceGateway, type ModelRole } from '@/inference';
import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
} from 'langchain';

import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import { createQueryAssistantTool } from '@/agents/tools/queryAssistantTool';
import type { AgentInput } from '@/agents/types';

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
          alwaysInclude: ['irmin_retrieve_docs_context', 'query_sql_assistant'],
        }),
      ],
    };
  }

  // Uses base execute() - non-streaming
}
