import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  supportsStreaming: false,
  contextRequirements: [
    // Current script
    {
      name: 'script-path',
      required: true,
      description:
        'The path of the script that the user is currently working with. The script path can be used to determine the language of the script (e.g., file extension), though currently all scripts are Go.',
    },
    {
      name: 'current-script-content',
      required: false,
      description:
        'The content of the script that the user is currently working with. This provides context about the current state of the script being edited.',
    },
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
    // Documentation context (auto-retrieved from the vector store)
    {
      name: 'irmin_documentation',
      required: false,
      description:
        'Relevant documentation snippet (guides, docs, APIs, SDK, etc.) retrieved from the Irmin knowledge base based on the user query. This documentation is retrieved using RAG (Retrieval Augmented Generation) and should be used to answer the user request.',
    },
  ],
};
