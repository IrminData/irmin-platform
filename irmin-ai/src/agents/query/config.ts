import { AgentConfig } from '@/agents/types';

import { DEFAULT_MODELS } from '@/config/defaults';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  modelProvider: 'groq',
  model: DEFAULT_MODELS.groq,
  temperature: 1,
  maxTokens: 1000,
  contextRequirements: [
    {
      name: 'repository_slug',
      description: 'The slug of the repository to query',
      required: true,
    },
    {
      name: 'object_path',
      description:
        'The path of the object to query, like /data/customers/customers.json',
      required: true,
    },
    {
      name: 'object_ref',
      description: 'The ref of the object to query, like main or tag/v1.0.0',
      required: false,
    },
  ],
  toolSelection: {
    includeTools: [
      'retrieve_docs_context',
      'execute_sql',
      'get_repository_object_schema',
      'list_repositories',
      'list_repository_objects',
    ],
  },
  streaming: false,
  useAgentGraph: true,
  maxToolCalls: 5,
  // Sanitization limits (optional, will use defaults if not specified)
  maxUserInputChars: 10000, // ~3k tokens
  maxSystemPromptChars: 105000, // ~30k tokens
};
