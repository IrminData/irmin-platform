import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'assistant',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  supportsStreaming: true,
  contextRequirements: [
    // Connection context
    {
      name: 'connection-id',
      required: false,
      description:
        'The ID of the connection that the user is currently working with',
    },
    // Workflow context
    {
      name: 'workflow-id',
      required: false,
      description:
        'The ID of the workflow that the user is currently working with',
    },
    // Query context
    {
      name: 'stored-query-id',
      required: false,
      description:
        'The ID of the stored query that the user is currently working with',
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
