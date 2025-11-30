import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  supportsStreaming: false,
  contextRequirements: [
    // Editor script path context
    {
      name: 'editor-script-paths',
      required: false,
      description:
        'Comma seperated list of script paths the user is currently working with in the editor',
    },
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
