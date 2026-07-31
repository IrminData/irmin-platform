import type { Document } from '@langchain/core/documents';
import { z } from 'zod';

import { analyticsService } from '@/services/analytics';
import { hydeCacheService } from '@/services/hydeCache';
import { llmService } from '@/services/llm';

import { getContentAsString } from '@/utils/getContentAsString';

import { indexingService } from './IndexingService';
import { qdrantService, SearchResult } from './QdrantService';

/**
 * Domain-specific prompts for HyDE (Hypothetical Document Embeddings)
 * These prompts generate hypothetical documentation excerpts that improve vector search quality
 * by creating richer embeddings that better match actual document content.
 */
const HYDE_PROMPTS: Record<string, string> = {
  'duckdb-sql-syntax-docs': `You are a technical documentation writer for DuckDB SQL.

Given a user's SQL question, write a hypothetical excerpt from DuckDB documentation that would contain the answer.

Include:
- SQL syntax patterns with code examples
- Function signatures and parameter descriptions
- Data type considerations
- Common use cases and edge cases
- Performance notes where relevant

Write 2-3 paragraphs as if from official DuckDB documentation.`,

  'irmin-docs': `You are a technical documentation writer for Irmin data platform.

Given a user's question about Irmin, write a hypothetical excerpt from Irmin documentation that would contain the answer.

Include:
- API endpoints or SDK methods where relevant
- Configuration options and parameters
- Code examples in Go or TypeScript
- Integration patterns and best practices
- Related features or workflows

Write 2-3 paragraphs as if from official Irmin documentation.`,

  default: `Given the user's question, write a hypothetical documentation excerpt that would contain the answer.

Include:
- Technical specifications and parameters
- Code examples where relevant
- Configuration options
- Best practices and common patterns

Write 2-3 paragraphs of documentation content.`,
};

/**
 * Format search results into a structured context string with source attribution and scores
 */
function formatSearchContext(
  results: VectorSearchResult[],
  query: string,
  options: { includeMetadata?: boolean } = {}
): { formatted: string; tokenCount: number } {
  if (results.length === 0) {
    return {
      formatted: '',
      tokenCount: 0,
    };
  }

  const contextParts = results.map((result, index) => {
    const source =
      (result.document.metadata?.source as string) ||
      (result.document.metadata?.sourceFile as string) ||
      'Unknown';
    const score = result.score?.toFixed(3) || 'N/A';

    let header = `[Result ${index + 1} - Source: ${source}, Score: ${score}]`;
    if (options.includeMetadata && result.document.metadata) {
      const metaStr = Object.entries(result.document.metadata)
        .filter(([key]) => !['source', 'sourceFile'].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (metaStr) {
        header += `\nMetadata: ${metaStr}`;
      }
    }

    return `${header}\n${result.document.pageContent}`;
  });

  const truncatedQuery =
    query.length > 100 ? query.slice(0, 100) + '...' : query;
  const formatted = `=== Search Results for: "${truncatedQuery}" ===\n\n${contextParts.join('\n\n---\n\n')}`;
  const tokenCount = Math.ceil(formatted.length / 4);

  return { formatted, tokenCount };
}

/**
 * Filter search results to fit within a token limit and prepare for formatting
 */
function filterResultsByTokenLimit(
  results: VectorSearchResult[],
  maxTokens: number
): { resultsToFormat: VectorSearchResult[]; sources: Document[] } {
  const sources: Document[] = [];
  const resultsToFormat: VectorSearchResult[] = [];
  let estimatedTokens = 100; // Reserve for header

  for (const result of results) {
    const docTokens = Math.ceil(result.document.pageContent.length / 4) + 50; // +50 for formatting overhead
    if (estimatedTokens + docTokens <= maxTokens) {
      resultsToFormat.push(result);
      sources.push(result.document);
      estimatedTokens += docTokens;
    } else {
      break;
    }
  }

  return { resultsToFormat, sources };
}

/**
 * Check if a query is empty or whitespace-only
 */
function isEmptyQuery(query: string): boolean {
  return !query || query.trim().length === 0;
}

// Zod schemas for type safety
const VectorSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  k: z.number().min(1).max(100).default(5),
  filter: z.record(z.string(), z.unknown()).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
});

const QueryAnalysisSchema = z.object({
  query: z.string().describe('Search query to run.'),
  filters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Metadata filters to apply.'),
  contextWindow: z
    .number()
    .min(1)
    .max(50)
    .default(5)
    .describe('Number of documents to retrieve.'),
});

type VectorSearchOptions = z.infer<typeof VectorSearchSchema>;
type QueryAnalysis = z.infer<typeof QueryAnalysisSchema>;

interface VectorSearchResult {
  document: Document;
  score: number;
}

interface RetrievalResult {
  documents: VectorSearchResult[];
  query: string;
  totalResults: number;
  processingTime: number;
}

/**
 * RetrievalService handles the "Retrieval and Generation" part of RAG:
 * 1. Query analysis and optimization
 * 2. Vector similarity search
 * 3. Result filtering and ranking
 * 4. Context preparation for generation
 */
class RetrievalService {
  private defaultCollectionName = 'irmin-documents';

  /**
   * Helper to convert Qdrant search result to VectorSearchResult
   */
  private mapQdrantResult(result: SearchResult): VectorSearchResult {
    const payload = result.payload || {};
    const content =
      typeof payload.content === 'string'
        ? payload.content
        : typeof payload.pageContent === 'string'
          ? payload.pageContent
          : '';

    const metadata = (payload.metadata as Record<string, unknown>) || {};

    return {
      score: result.score,
      document: {
        pageContent: content,
        metadata: metadata,
      },
    };
  }

  /**
   * Perform similarity search with advanced options
   */
  async searchSimilar(
    collectionName: string,
    options: VectorSearchOptions
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      const validatedOptions = VectorSearchSchema.parse(options);

      // 1. Generate query embedding
      const embeddingStart = Date.now();
      const queryEmbedding = await indexingService.createEmbedding(
        validatedOptions.query
      );
      console.log(
        `[Agent Timing] createEmbedding: ${Date.now() - embeddingStart}ms`
      );

      // 2. Perform similarity search
      const qdrantStart = Date.now();
      const results = await qdrantService.search(
        collectionName,
        queryEmbedding,
        validatedOptions.k,
        validatedOptions.filter,
        validatedOptions.scoreThreshold
      );
      console.log(
        `[Agent Timing] qdrantService.search: ${Date.now() - qdrantStart}ms`
      );

      // 3. Convert to our result format
      const searchResults: VectorSearchResult[] = results.map((r) =>
        this.mapQdrantResult(r)
      );

      const processingTime = Date.now() - startTime;

      const result: RetrievalResult = {
        documents: searchResults,
        query: validatedOptions.query,
        totalResults: searchResults.length,
        processingTime,
      };

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'similarity_search',
        eventData: {
          query: validatedOptions.query,
          resultCount: searchResults.length,
          processingTimeMs: processingTime,
          collectionName: collectionName || this.defaultCollectionName,
          k: validatedOptions.k,
          hasFilter: !!validatedOptions.filter,
          scoreThreshold: validatedOptions.scoreThreshold,
        },
      });

      return result;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'similarity_search',
        eventData: {
          query: options.query,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to search vectors: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve documents with query analysis (advanced RAG pattern)
   */
  async retrieveWithAnalysis(
    collectionName: string,
    analysis: QueryAnalysis
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      const validatedAnalysis = QueryAnalysisSchema.parse(analysis);

      // 1. Generate query embedding
      const queryEmbedding = await indexingService.createEmbedding(
        validatedAnalysis.query
      );

      // 2. Perform enhanced similarity search using analyzed query
      const results = await qdrantService.search(
        collectionName,
        queryEmbedding,
        validatedAnalysis.contextWindow,
        validatedAnalysis.filters
      );

      // 3. Convert to our result format
      const searchResults: VectorSearchResult[] = results.map((r) =>
        this.mapQdrantResult(r)
      );

      const processingTime = Date.now() - startTime;

      const result: RetrievalResult = {
        documents: searchResults,
        query: validatedAnalysis.query,
        totalResults: searchResults.length,
        processingTime,
      };

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'retrieval_with_analysis',
        eventData: {
          query: validatedAnalysis.query,
          resultCount: searchResults.length,
          processingTimeMs: processingTime,
          collectionName: collectionName || this.defaultCollectionName,
          contextWindow: validatedAnalysis.contextWindow,
          hasFilters: !!validatedAnalysis.filters,
        },
      });

      return result;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'retrieval_with_analysis',
        eventData: {
          query: analysis.query,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to retrieve with analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve relevant context for generation (preparing documents for LLM)
   * Returns structured context with source attribution and scores for consistency with HyDE retrieval.
   */
  async retrieveContext(
    collectionName: string,
    query: string,
    options: {
      maxDocuments?: number;
      scoreThreshold?: number;
      includeMetadata?: boolean;
      maxTokens?: number;
    } = {}
  ): Promise<{
    context: string;
    sources: Document[];
    totalTokens: number;
    searchTimeMs: number;
  }> {
    // Handle empty/whitespace queries consistently with HyDE path
    if (isEmptyQuery(query)) {
      return {
        context: '',
        sources: [],
        totalTokens: 0,
        searchTimeMs: 0,
      };
    }

    try {
      const {
        maxDocuments = 5,
        scoreThreshold = 0.0,
        includeMetadata = false,
        maxTokens = 4000,
      } = options;

      // Track search timing for consistent metrics with HyDE path
      const searchStartTime = Date.now();
      const retrievalResult = await this.searchSimilar(collectionName, {
        query,
        k: maxDocuments,
        scoreThreshold,
      });
      const searchTimeMs = Date.now() - searchStartTime;

      // Filter results that fit within token limit
      const { resultsToFormat, sources } = filterResultsByTokenLimit(
        retrievalResult.documents,
        maxTokens
      );

      // Format context with structured output (consistent with HyDE retrieval)
      const { formatted: context, tokenCount } = formatSearchContext(
        resultsToFormat,
        query,
        { includeMetadata }
      );

      // Note: Analytics logging is handled by callers (route handlers) to avoid duplicates
      // and provide more comprehensive context (useHyde, reason, etc.)

      return {
        context: context.trim(),
        sources,
        totalTokens: tokenCount,
        searchTimeMs,
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'context_retrieval',
        eventData: {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Multi-query retrieval (for complex questions)
   */
  async multiQueryRetrieval(
    collectionName: string,
    queries: string[],
    options: {
      maxDocumentsPerQuery?: number;
      combineResults?: boolean;
      deduplicateByContent?: boolean;
    } = {}
  ): Promise<RetrievalResult[]> {
    try {
      const { maxDocumentsPerQuery = 3, deduplicateByContent = true } = options;

      const allResults: RetrievalResult[] = [];
      const seenContent = new Set<string>();

      for (const query of queries) {
        const result = await this.searchSimilar(collectionName, {
          query,
          k: maxDocumentsPerQuery,
        });

        if (deduplicateByContent) {
          result.documents = result.documents.filter((doc) => {
            const content = doc.document.pageContent;
            if (seenContent.has(content)) {
              return false;
            }
            seenContent.add(content);
            return true;
          });
        }

        allResults.push(result);
      }

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'multi_query_retrieval',
        eventData: {
          queryCount: queries.length,
          totalResults: allResults.reduce((sum, r) => sum + r.totalResults, 0),
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return allResults;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'multi_query_retrieval',
        eventData: {
          query: queries.join(', '),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to perform multi-query retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Contextual compression retrieval (filter irrelevant parts)
   */
  async retrieveWithCompression(
    collectionName: string,
    query: string,
    options: {
      k?: number;
      compressionThreshold?: number;
      maxChunkSize?: number;
    } = {}
  ): Promise<RetrievalResult> {
    try {
      const { k = 5, compressionThreshold = 0.5, maxChunkSize = 500 } = options;

      // First, retrieve candidate documents
      const result = await this.searchSimilar(collectionName, { query, k });

      // Apply compression by filtering based on relevance and chunk size
      const compressedResults = result.documents
        .filter((doc) => doc.score >= compressionThreshold)
        .map((doc) => ({
          ...doc,
          document: {
            ...doc.document,
            pageContent: doc.document.pageContent.slice(0, maxChunkSize),
          },
        }));

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'compressed_retrieval',
        eventData: {
          query,
          originalCount: result.documents.length,
          compressedCount: compressedResults.length,
          compressionThreshold,
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return {
        ...result,
        documents: compressedResults,
        totalResults: compressedResults.length,
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'compressed_retrieval',
        eventData: {
          query,
          collectionName: collectionName || this.defaultCollectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to perform compressed retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate hypothetical content for a query using LLM
   * This creates richer embeddings that often match document content better than raw queries
   * @param query - The user's query
   * @param collectionName - Optional collection name to customize the prompt (e.g., 'duckdb-sql-syntax-docs' for SQL-specific generation)
   * @param agentContext - Optional agent context to customize the prompt
   */
  private async generateHypotheticalContent(
    query: string,
    collectionName?: string,
    agentContext?: Record<string, unknown>
  ): Promise<string | null> {
    const effectiveCollectionName =
      collectionName || this.defaultCollectionName;

    // Use cache to avoid repeated LLM calls for similar queries
    // This saves 1-3 seconds on cache hits
    // Include agentContext in cache key since it affects the generated content
    return hydeCacheService.getCachedHydeOrGenerate(
      query,
      effectiveCollectionName,
      async () => {
        const startTime = Date.now();
        const TIMEOUT_MS = 5000;

        try {
          const llm = llmService.createLLM({
            provider: 'groq',
            model: 'llama-3.1-8b-instant',
            temperature: 0.6,
            maxTokens: 500, // Increased for 2-3 paragraph responses
          });

          // Select domain-specific prompt based on collection name
          const basePrompt =
            HYDE_PROMPTS[collectionName ?? ''] || HYDE_PROMPTS.default;

          // Format agent context if provided
          let contextStr = '';
          if (agentContext && Object.keys(agentContext).length > 0) {
            contextStr = `\n\nAdditional Context:\n${Object.entries(
              agentContext
            )
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}`;
          }

          const systemPrompt = `${basePrompt}${contextStr}

Just respond with the hypothetical documentation excerpt, no other text.`;

          const response = await Promise.race([
            llm.invoke([
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: query,
              },
            ]),
            new Promise<never>((_resolve, reject) =>
              setTimeout(
                () => reject(new Error('Hypothetical generation timeout')),
                TIMEOUT_MS
              )
            ),
          ]);

          const hypotheticalContent = getContentAsString(
            response.content
          ).trim();
          const generationTime = Date.now() - startTime;

          analyticsService.logEvent({
            eventType: 'hypothetical_generation',
            eventData: {
              query,
              collectionName: effectiveCollectionName,
              processingTimeMs: generationTime,
              promptType: HYDE_PROMPTS[collectionName ?? '']
                ? collectionName
                : 'default',
              cached: false,
            },
          });

          return hypotheticalContent || null;
        } catch (error) {
          // Log the error but return null for graceful fallback to direct query
          analyticsService.logEvent({
            eventType: 'hypothetical_generation_error',
            eventData: {
              query,
              collectionName: effectiveCollectionName,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          // Return null to trigger fallback to direct query search
          return null;
        }
      },
      agentContext
    );
  }

  /**
   * Retrieve context using hypothetical content generation
   * Falls back to direct query if hypothetical generation fails
   */
  async retrieveWithHypotheticalContent(
    collectionName: string,
    query: string,
    options: {
      maxDocuments?: number;
      scoreThreshold?: number;
      includeMetadata?: boolean;
      maxTokens?: number;
    } = {},
    agentContext?: Record<string, unknown>
  ): Promise<{
    context: string;
    sources: Document[];
    totalTokens: number;
    usedHypothetical: boolean;
    hypotheticalContent?: string;
    metrics: {
      generationTimeMs: number;
      searchTimeMs: number;
      totalTimeMs: number;
    };
  }> {
    const startTime = Date.now();

    if (isEmptyQuery(query)) {
      return {
        context: '',
        sources: [],
        totalTokens: 0,
        usedHypothetical: false,
        metrics: {
          generationTimeMs: 0,
          searchTimeMs: 0,
          totalTimeMs: 0,
        },
      };
    }

    try {
      const {
        maxDocuments = 5,
        scoreThreshold = 0.0,
        includeMetadata = false,
        maxTokens = 4000, // Consistent with retrieveContext and API schema default
      } = options;

      // Track generation timing
      const generationStartTime = Date.now();
      const hypotheticalContent = await this.generateHypotheticalContent(
        query,
        collectionName,
        agentContext
      );
      const generationTimeMs = Date.now() - generationStartTime;

      const searchQuery = hypotheticalContent || query;
      const usedHypothetical = !!hypotheticalContent;

      if (!hypotheticalContent) {
        analyticsService.logEvent({
          eventType: 'hypothetical_fallback',
          eventData: {
            query,
            collectionName: collectionName || this.defaultCollectionName,
          },
        });
      }

      // Track search timing
      const searchStartTime = Date.now();
      const retrievalResult = await this.searchSimilar(collectionName, {
        query: searchQuery,
        k: maxDocuments,
        scoreThreshold,
      });
      const searchTimeMs = Date.now() - searchStartTime;

      // Filter results that fit within token limit
      const { resultsToFormat, sources } = filterResultsByTokenLimit(
        retrievalResult.documents,
        maxTokens
      );

      // Format context with structured output
      const { formatted: context, tokenCount } = formatSearchContext(
        resultsToFormat,
        query,
        { includeMetadata }
      );

      const totalTimeMs = Date.now() - startTime;

      analyticsService.logEvent({
        eventType: 'hypothetical_context_retrieved',
        eventData: {
          query,
          sourcesCount: sources.length,
          estimatedTokens: tokenCount,
          generationTimeMs,
          searchTimeMs,
          totalTimeMs,
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return {
        context: context.trim(),
        sources,
        totalTokens: tokenCount,
        usedHypothetical,
        hypotheticalContent:
          usedHypothetical && hypotheticalContent
            ? hypotheticalContent
            : undefined,
        metrics: {
          generationTimeMs,
          searchTimeMs,
          totalTimeMs,
        },
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'hypothetical_context_retrieval',
        eventData: {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to retrieve context with hypothetical content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Unified context retrieval that handles both HyDE and direct query modes.
   * Use this method from API routes to avoid duplicating the useHyde conditional logic.
   *
   * @param collectionName - The collection to search
   * @param query - The search query
   * @param options - Retrieval options including useHyde flag
   * @returns Unified result with context, sources, metrics, and HyDE-specific data
   */
  async retrieveContextWithOptions(
    collectionName: string,
    query: string,
    options: {
      maxDocuments?: number;
      scoreThreshold?: number;
      includeMetadata?: boolean;
      maxTokens?: number;
      useHyde?: boolean;
    } = {}
  ): Promise<{
    context: string;
    sources: Document[];
    totalTokens: number;
    useHyde: boolean;
    usedHypothetical: boolean;
    hypotheticalContent?: string;
    metrics: {
      generationTimeMs: number;
      searchTimeMs: number;
      totalTimeMs: number;
    };
  }> {
    const { useHyde = true, ...retrievalOptions } = options;

    if (useHyde) {
      const result = await this.retrieveWithHypotheticalContent(
        collectionName,
        query,
        retrievalOptions
      );
      return {
        ...result,
        useHyde: true,
      };
    }

    // Direct query without HyDE
    const startTime = Date.now();
    const result = await this.retrieveContext(
      collectionName,
      query,
      retrievalOptions
    );
    const totalTimeMs = Date.now() - startTime;

    // Extract searchTimeMs from result to avoid including it in spread
    const { searchTimeMs, ...restResult } = result;

    return {
      ...restResult,
      useHyde: false,
      usedHypothetical: false,
      metrics: {
        generationTimeMs: 0,
        searchTimeMs,
        totalTimeMs,
      },
    };
  }
}

export const retrievalService = new RetrievalService();
export type {
  VectorSearchOptions,
  VectorSearchResult,
  RetrievalResult,
  QueryAnalysis,
};
