import { indexingService, retrievalService } from '@/vector';

import { BaseAgent } from '@/agents/base';
import type { AgentInput } from '@/agents/types';

import { agentConfig } from './config';

export class QueryAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions() {
    return {
      llmOptions: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        temperature: 1.0,
        maxTokens: 1000,
      },
    };
  }

  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    // Get base context (includes irmin-docs from BaseAgent)
    const context = await super.prepareContext(input);

    // Fetch DuckDB SQL documentation from vector store (specific to QueryAgent)
    try {
      const vectorStore = await indexingService.initVectorStore(
        'duckdb-sql-syntax-docs',
        true
      );

      const docsResult = await retrievalService.retrieveWithHypotheticalContent(
        vectorStore,
        input.message,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 6000,
        },
        'duckdb-sql-syntax-docs'
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.duckdb_documentation = docsResult.context;
      }
    } catch (error) {
      console.warn('Failed to retrieve DuckDB documentation context:', error);
    }

    return context;
  }

  // Uses base execute() - non-streaming
}
