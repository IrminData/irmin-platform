import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  supportsStreaming: false,
  // Include SQL-focused docs statically (avoids ~1.5s embedding latency)
  staticDocs: 'query', // concepts, sql, object-schema
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
    // Documentation context (statically injected from llm-docs folder)
    {
      name: 'irmin-documentation',
      required: false,
      description:
        'Irmin documentation covering concepts, SQL querying, and object schemas. Statically injected for fast context loading. Use irmin_hyde_search for deeper queries.',
    },
    // DuckDB documentation (can be retrieved on-demand via tools)
    {
      name: 'duckdb_documentation',
      required: false,
      description:
        'DuckDB SQL syntax documentation. Use the duckdb_hyde_search tool for specific syntax questions.',
    },
  ],
};
