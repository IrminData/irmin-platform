import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  supportsStreaming: false,
  contextRequirements: [
    // Repository context
    {
      name: 'repository-slug',
      required: false,
      description:
        'The slug of the repository that the user is currently working with',
    },
    {
      name: 'repository-object-path',
      required: false,
      description:
        'The path of the object that the user is currently working with',
    },
    {
      name: 'repository-ref',
      required: false,
      description:
        'The ref of the object that the user is currently working with',
    },
  ],
};
