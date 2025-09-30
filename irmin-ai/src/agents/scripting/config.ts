import { AgentConfig } from '@/agents/types';

import { DEFAULT_MODELS } from '@/config/defaults';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  type: 'chat',
  modelProvider: 'groq',
  model: DEFAULT_MODELS.groq,
  maxTokens: 2000,
  responseFormat: 'structured',
  contextRequirements: [],
  toolSelection: {
    includeTools: [
      'retrieve_docs_context',
      'execute_sql',
      'get_repository_object_schema',
      'list_connections',
      'list_workflows',
      'list_workflow_runs',
      'list_repositories',
      'list_repository_objects',
    ],
  },
  streaming: false,
  useAgentGraph: true,
  maxToolCalls: 5,
};
