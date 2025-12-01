import { indexingService, retrievalService } from '@/vector';
import { collectionService } from '@/vector/vectorCollections';

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
    const collectionName = 'duckdb-sql-syntax-docs';

    // Check if collection exists before trying to use it
    const collection = await collectionService.getCollectionByName(
      collectionName,
      undefined,
      undefined,
      true // isSystemCollection
    );

    if (!collection) {
      console.warn(
        `Collection '${collectionName}' not found. DuckDB documentation context will not be available. ` +
          `Run the vectorize-docs script to create this collection: ` +
          `POST /api/system/scripts/vectorize-docs or tsx src/scripts/vectorize-docs.ts`
      );
      return context;
    }

    try {
      const vectorStore = await indexingService.initVectorStore(
        collectionName,
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
        collectionName
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.duckdb_documentation = docsResult.context;
      }
    } catch (error) {
      console.warn(
        `Failed to retrieve DuckDB documentation context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return context;
  }

  // Uses base execute() - non-streaming
}
