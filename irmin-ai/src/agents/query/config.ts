import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  type: 'chat',
  modelProvider: 'groq',
  model: 'openai/gpt-oss-120b',
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
      'list_workspaces', // TODO: This is temporary, since we will want to provide the workspace to the agent in the context.
      'list_repositories',
      'list_repository_objects',
    ],
  },
  streaming: false,
};
