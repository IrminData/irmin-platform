import type { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { z } from 'zod';

import { analyticsService } from '@/services/analytics';

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
      await analyticsService.logVectorRetrieval('similarity_search', {
        query: validatedOptions.query,
        resultCount: searchResults.length,
        processingTimeMs: processingTime,
        collectionName: collectionName || this.defaultCollectionName,
        k: validatedOptions.k,
        hasFilter: !!validatedOptions.filter,
        scoreThreshold: validatedOptions.scoreThreshold,
      });

      return result;
    } catch (error) {
      await analyticsService.logVectorError(
        'similarity_search',
        error instanceof Error ? error.message : 'Unknown error',
        { query: options.query }
      );
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
      await analyticsService.logVectorRetrieval('retrieval_with_analysis', {
        query: validatedAnalysis.query,
        resultCount: searchResults.length,
        processingTimeMs: processingTime,
        collectionName: collectionName || this.defaultCollectionName,
        contextWindow: validatedAnalysis.contextWindow,
        hasFilters: !!validatedAnalysis.filters,
      });

      return result;
    } catch (error) {
      await analyticsService.logVectorError(
        'retrieval_with_analysis',
        error instanceof Error ? error.message : 'Unknown error',
        { query: analysis.query }
      );
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
      await analyticsService.logVectorRetrieval('context_retrieved', {
        query,
        sourcesCount: sources.length,
        estimatedTokens: tokenCount,
        collectionName: collectionName || this.defaultCollectionName,
      });

      return {
        context: context.trim(),
        sources,
        totalTokens: tokenCount,
      };
    } catch (error) {
      await analyticsService.logVectorError(
        'context_retrieval',
        error instanceof Error ? error.message : 'Unknown error',
        { query }
      );
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
      await analyticsService.logVectorRetrieval('multi_query_retrieval', {
        queryCount: queries.length,
        totalResults: allResults.reduce((sum, r) => sum + r.totalResults, 0),
        collectionName: collectionName || this.defaultCollectionName,
      });

      return allResults;
    } catch (error) {
      await analyticsService.logVectorError(
        'multi_query_retrieval',
        error instanceof Error ? error.message : 'Unknown error',
        { queryCount: queries.length }
      );
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
      await analyticsService.logVectorRetrieval('compressed_retrieval', {
        query,
        originalCount: result.documents.length,
        compressedCount: compressedResults.length,
        compressionThreshold,
        collectionName: collectionName || this.defaultCollectionName,
      });

      return {
        ...result,
        documents: compressedResults,
        totalResults: compressedResults.length,
      };
    } catch (error) {
      await analyticsService.logVectorError(
        'compressed_retrieval',
        error instanceof Error ? error.message : 'Unknown error',
        { query }
      );
      throw new Error(
        `Failed to perform compressed retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`
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
