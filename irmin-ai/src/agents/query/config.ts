import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  supportsStreaming: false,
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
};
