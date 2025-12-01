import type { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { z } from 'zod';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';

import { getContentAsString } from '@/utils/getContentAsString';

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
   * Perform similarity search with advanced options
   */
  async searchSimilar(
    vectorStore: QdrantVectorStore,
    options: VectorSearchOptions,
    collectionName?: string
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      const validatedOptions = VectorSearchSchema.parse(options);

      // Perform similarity search
      const results = await vectorStore.similaritySearchWithScore(
        validatedOptions.query,
        validatedOptions.k,
        validatedOptions.filter
      );

      // Filter by score threshold if provided
      const filteredResults = validatedOptions.scoreThreshold
        ? results.filter(
            ([, score]) => score >= validatedOptions.scoreThreshold!
          )
        : results;

      // Convert to our result format
      const searchResults: VectorSearchResult[] = filteredResults.map(
        ([document, score]) => ({
          document,
          score,
        })
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
    vectorStore: QdrantVectorStore,
    analysis: QueryAnalysis,
    collectionName?: string
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      const validatedAnalysis = QueryAnalysisSchema.parse(analysis);

      // Perform enhanced similarity search using analyzed query
      const results = await vectorStore.similaritySearchWithScore(
        validatedAnalysis.query,
        validatedAnalysis.contextWindow,
        validatedAnalysis.filters
      );

      // Convert to our result format
      const searchResults: VectorSearchResult[] = results.map(
        ([document, score]) => ({
          document,
          score,
        })
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
   */
  async retrieveContext(
    vectorStore: QdrantVectorStore,
    query: string,
    options: {
      maxDocuments?: number;
      scoreThreshold?: number;
      includeMetadata?: boolean;
      maxTokens?: number;
    } = {},
    collectionName?: string
  ): Promise<{
    context: string;
    sources: Document[];
    totalTokens: number;
  }> {
    try {
      const {
        maxDocuments = 5,
        scoreThreshold = 0.0,
        includeMetadata = false,
        maxTokens = 4000,
      } = options;

      // Retrieve relevant documents
      const retrievalResult = await this.searchSimilar(
        vectorStore,
        {
          query,
          k: maxDocuments,
          scoreThreshold,
        },
        collectionName
      );

      // Filter and prepare context
      let context = '';
      let tokenCount = 0;
      const sources: Document[] = [];

      for (const result of retrievalResult.documents) {
        const docContent = result.document.pageContent;
        const metadataStr = includeMetadata
          ? `\n[Source: ${JSON.stringify(result.document.metadata)}]\n`
          : '';

        const docText = `${docContent}${metadataStr}\n\n`;
        const estimatedTokens = Math.ceil(docText.length / 4); // Rough token estimation

        if (tokenCount + estimatedTokens <= maxTokens) {
          context += docText;
          tokenCount += estimatedTokens;
          sources.push(result.document);
        } else {
          break;
        }
      }

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'context_retrieved',
        eventData: {
          query,
          sourcesCount: sources.length,
          estimatedTokens: tokenCount,
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return {
        context: context.trim(),
        sources,
        totalTokens: tokenCount,
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
    vectorStore: QdrantVectorStore,
    queries: string[],
    options: {
      maxDocumentsPerQuery?: number;
      combineResults?: boolean;
      deduplicateByContent?: boolean;
    } = {},
    collectionName?: string
  ): Promise<RetrievalResult[]> {
    try {
      const { maxDocumentsPerQuery = 3, deduplicateByContent = true } = options;

      const allResults: RetrievalResult[] = [];
      const seenContent = new Set<string>();

      for (const query of queries) {
        const result = await this.searchSimilar(
          vectorStore,
          { query, k: maxDocumentsPerQuery },
          collectionName
        );

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
    vectorStore: QdrantVectorStore,
    query: string,
    options: {
      k?: number;
      compressionThreshold?: number;
      maxChunkSize?: number;
    } = {},
    collectionName?: string
  ): Promise<RetrievalResult> {
    try {
      const { k = 5, compressionThreshold = 0.5, maxChunkSize = 500 } = options;

      // First, retrieve candidate documents
      const result = await this.searchSimilar(
        vectorStore,
        { query, k },
        collectionName
      );

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
   */
  private async generateHypotheticalContent(
    query: string,
    collectionName?: string
  ): Promise<string | null> {
    const startTime = Date.now();
    const TIMEOUT_MS = 5000;

    try {
      const llm = llmService.createLLM({
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        temperature: 0.6,
        maxTokens: 300,
      });

      // Use SQL-specific prompt for DuckDB SQL documentation collection
      const isSQLDocs = collectionName === 'duckdb-sql-syntax-docs';

      const systemPrompt = isSQLDocs
        ? `Convert the user's SQL-related question into a hypothetical SQL documentation excerpt that would contain the answer. Include SQL syntax patterns, keywords, clauses, functions, and examples that would be found in SQL documentation. Focus on DuckDB SQL syntax, data types, query patterns, and statement structures. Just respond with the hypothetical documentation excerpt, no other text.`
        : `Convert the user message in to a hypothetical answer/response that would contain keywords, concepts, topics, etc. that would likely contain the answer or relevant information about this topic, which will be used to retrieve relevant documents from the vector store. Just respond with the hypothetical answer/response, no other text.`;

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

      const hypotheticalContent = getContentAsString(response.content).trim();
      const generationTime = Date.now() - startTime;

      analyticsService.logEvent({
        eventType: 'hypothetical_generation',
        eventData: {
          query,
          collectionName: collectionName || this.defaultCollectionName,
          processingTimeMs: generationTime,
          isSQLDocs,
        },
      });

      return hypotheticalContent || null;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'hypothetical_generation',
        eventData: {
          query,
          collectionName: collectionName || this.defaultCollectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to generate hypothetical content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve context using hypothetical content generation
   * Falls back to direct query if hypothetical generation fails
   */
  async retrieveWithHypotheticalContent(
    vectorStore: QdrantVectorStore,
    query: string,
    options: {
      maxDocuments?: number;
      scoreThreshold?: number;
      includeMetadata?: boolean;
      maxTokens?: number;
    } = {},
    collectionName?: string
  ): Promise<{
    context: string;
    sources: Document[];
    totalTokens: number;
    usedHypothetical: boolean;
    hypotheticalContent?: string;
  }> {
    const startTime = Date.now();

    if (!query || query.trim().length === 0) {
      return {
        context: '',
        sources: [],
        totalTokens: 0,
        usedHypothetical: false,
      };
    }

    try {
      const {
        maxDocuments = 5,
        scoreThreshold = 0.0,
        includeMetadata = false,
        maxTokens = 8000,
      } = options;

      const hypotheticalContent = await this.generateHypotheticalContent(
        query,
        collectionName
      );

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
      const retrievalResult = await this.searchSimilar(
        vectorStore,
        {
          query: searchQuery,
          k: maxDocuments,
          scoreThreshold,
        },
        collectionName
      );

      // Filter and prepare context
      let context = '';
      let tokenCount = 0;
      const sources: Document[] = [];

      for (const result of retrievalResult.documents) {
        const docContent = result.document.pageContent;
        const metadataStr = includeMetadata
          ? `\n[Source: ${JSON.stringify(result.document.metadata)}]\n`
          : '';

        const docText = `${docContent}${metadataStr}\n\n`;
        const estimatedTokens = Math.ceil(docText.length / 4); // Rough token estimation

        if (tokenCount + estimatedTokens <= maxTokens) {
          context += docText;
          tokenCount += estimatedTokens;
          sources.push(result.document);
        } else {
          break;
        }
      }

      analyticsService.logEvent({
        eventType: 'hypothetical_context_retrieved',
        eventData: {
          query,
          sourcesCount: sources.length,
          estimatedTokens: tokenCount,
          processingTimeMs: Date.now() - startTime,
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
}

export const retrievalService = new RetrievalService();
export type {
  VectorSearchOptions,
  VectorSearchResult,
  RetrievalResult,
  QueryAnalysis,
};
