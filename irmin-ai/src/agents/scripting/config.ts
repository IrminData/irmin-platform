import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  supportsStreaming: false,
  // Include scripting-focused docs statically (avoids ~1.5s embedding latency)
  staticDocs: 'scripting', // concepts, scripting, object-schema
  contextRequirements: [
    // Current script
    {
      name: 'script-name',
      required: true,
      description:
        'The name of the script that the user is currently working with. The script name can be used to determine the language of the script (e.g., file extension).',
    },
    {
      name: 'current-script-content',
      required: false,
      description:
        'The content of the script that the user is currently working with. This provides context about the current state of the script being edited.',
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
    // Documentation context (statically injected from llm-docs folder)
    {
      name: 'irmin-documentation',
      required: false,
      description:
        'Irmin documentation covering concepts, scripting runtime, and object schemas. Statically injected for fast context loading. Use irmin_hyde_search for deeper queries.',
    },
  ],
};
