import { indexingService, retrievalService } from '@/vector';
import { DynamicStructuredTool } from 'langchain';
import { z } from 'zod';

/**
 * Creates a HyDE (Hypothetical Document Embeddings) search tool.
 *
 * This tool uses LLM-generated hypothetical content to improve vector search
 * quality for complex queries. It takes 1-3 seconds longer than direct search
 * but provides more semantically accurate results.
 *
 * Use this tool when:
 * - The user asks a complex technical question
 * - Direct search results seem incomplete or off-topic
 * - You need comprehensive documentation coverage
 *
 * @param collectionName - The vector collection to search (default: 'irmin-docs')
 * @returns A DynamicStructuredTool for enhanced documentation search
 */
export function createHydeSearchTool(
  collectionName: string = 'irmin-docs'
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'irmin_hyde_search',
    description:
      'Enhanced documentation search using AI-generated hypothetical content. ' +
      'Use this when you need higher quality search results for complex technical questions, ' +
      'when direct search results are insufficient, or when the query requires deep understanding ' +
      'of Irmin concepts. This tool takes longer but provides more accurate results.',
    schema: z.object({
      query: z
        .string()
        .describe('The search query - be specific and include technical terms'),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe('Maximum number of results to return (default: 5)'),
    }),
    func: async ({ query, maxResults = 5 }) => {
      try {
        // Validate collection access
        const validatedCollection =
          await indexingService.validateCollectionAccess(
            collectionName,
            true // isSystemCollection
          );

        // Perform HyDE-enhanced retrieval
        const result = await retrievalService.retrieveWithHypotheticalContent(
          validatedCollection,
          query,
          {
            maxDocuments: maxResults,
            scoreThreshold: 0.3,
            includeMetadata: true,
            maxTokens: 4000,
          }
        );

        if (!result.context || !result.context.trim()) {
          return JSON.stringify({
            success: false,
            message: 'No relevant documentation found for the query.',
            query,
          });
        }

        return JSON.stringify({
          success: true,
          context: result.context,
          sources: result.sources,
          usedHypothetical: result.usedHypothetical,
          metrics: result.metrics,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          message: `Failed to perform enhanced search: ${errorMessage}`,
          query,
        });
      }
    },
  });
}

/**
 * Creates a DuckDB SQL documentation search tool with HyDE enhancement.
 *
 * Specialized for SQL syntax, function signatures, and query patterns.
 *
 * @returns A DynamicStructuredTool for DuckDB SQL documentation search
 */
export function createDuckDbHydeSearchTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'irmin_duckdb_hyde_search',
    description:
      'Enhanced DuckDB SQL documentation search. ' +
      'Use this when you need accurate SQL syntax, function signatures, or query patterns. ' +
      'Provides higher quality results for complex SQL questions.',
    schema: z.object({
      query: z
        .string()
        .describe(
          'The SQL-related search query - include function names, syntax patterns, or data types'
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe('Maximum number of results to return (default: 5)'),
    }),
    func: async ({ query, maxResults = 5 }) => {
      try {
        const collectionName = 'duckdb-sql-syntax-docs';
        const validatedCollection =
          await indexingService.validateCollectionAccess(
            collectionName,
            true // isSystemCollection
          );

        const result = await retrievalService.retrieveWithHypotheticalContent(
          validatedCollection,
          query,
          {
            maxDocuments: maxResults,
            scoreThreshold: 0.3,
            includeMetadata: true,
            maxTokens: 4000,
          }
        );

        if (!result.context || !result.context.trim()) {
          return JSON.stringify({
            success: false,
            message: 'No relevant DuckDB documentation found for the query.',
            query,
          });
        }

        return JSON.stringify({
          success: true,
          context: result.context,
          sources: result.sources,
          usedHypothetical: result.usedHypothetical,
          metrics: result.metrics,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          message: `Failed to perform DuckDB search: ${errorMessage}`,
          query,
        });
      }
    },
  });
}
