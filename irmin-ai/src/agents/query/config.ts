import { AgentConfig } from '@/agents/types';

import { DEFAULT_MODELS } from '@/config/defaults';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  type: 'chat',
  modelProvider: 'groq',
  model: DEFAULT_MODELS.groq,
  temperature: 1,
  maxTokens: 1000,
  responseFormat: 'structured',
  contextRequirements: [
    {
      type: 'schema',
      name: 'schema',
      required: true,
    },
  ],
  toolSelection: {
    includeTools: [
      'list_docs',
      'get_docs',
      'execute_sql',
      'get_repository_object_schema',
      'list_repositories',
      'list_repository_objects',
    ],
  },
  streaming: false,
  useAgentGraph: true,
  maxToolCalls: 5,
};
