import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'assistant',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  supportsStreaming: true,
  // Include minimal core docs statically (avoids ~1.5s embedding latency)
  // Keep this small (~4KB) to minimize time-to-first-token
  // Agent can use irmin_hyde_search tool for deeper queries about specific topics
  staticDocs: 'core', // concepts only (~4KB)
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
    // Script context
    {
      name: 'script-ids',
      required: false,
      description:
        'Comma seperated list of script IDs the user is currently working with in the editor',
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
        'Core Irmin documentation covering concepts, connections, and workflows. This is statically injected from local files for fast context loading. For deeper queries, use the irmin_hyde_search or irmin_retrieve_docs_context tools.',
    },
  ],
};
