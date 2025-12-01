import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  supportsStreaming: false,
  contextRequirements: [
    // Current SQL query
    {
      name: 'current-sql',
      required: false,
      description: 'The SQL query that the user is currently working with',
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
    {
      name: 'duckdb_documentation',
      required: false,
      description:
        'Relevant DuckDB SQL syntax documentation retrieved from the DuckDB knowledge base based on the user query. This includes SQL syntax, data types, statements, and query patterns. Use this documentation to ensure SQL queries follow correct DuckDB syntax and best practices.',
    },
  ],
};
