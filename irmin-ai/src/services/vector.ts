import type { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { z } from 'zod';

import { env } from '@/config/env';

import { analyticsService } from './analytics';

// Zod schemas for type safety
const VectorSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  k: z.number().min(1).max(100).default(5),
  filter: z.record(z.string(), z.unknown()).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
});

const VectorDocumentSchema = z.object({
  pageContent: z.string().min(1, 'Page content cannot be empty'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const VectorStoreConfigSchema = z.object({
  collectionName: z.string().min(1, 'Collection name cannot be empty'),
  url: z.string().min(1, 'Qdrant URL is required').default(env.QDRANT_URL),
  apiKey: z.string().optional().default(env.QDRANT_API_KEY),
});

type VectorSearchOptions = z.infer<typeof VectorSearchSchema>;
type VectorDocument = z.infer<typeof VectorDocumentSchema>;
type VectorStoreConfig = z.infer<typeof VectorStoreConfigSchema>;

interface VectorSearchResult {
  document: Document;
  score: number;
}

class VectorService {
  private embeddings: OpenAIEmbeddings;
  private defaultCollectionName = 'irmin-documents';

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });
  }

  /**
   * Create a new vector store instance
   */
  async createVectorStore(config: VectorStoreConfig) {
    const validatedConfig = VectorStoreConfigSchema.parse(config);

    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          url: validatedConfig.url,
          collectionName: validatedConfig.collectionName,
          apiKey: validatedConfig.apiKey,
        }
      );

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'vector_store_created',
          collectionName: validatedConfig.collectionName,
          url: validatedConfig.url,
        },
      });

      return vectorStore;
    } catch (error) {
      await analyticsService.logError(
        'vector_store_creation',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to create vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new collection and vector store
   */
  async createNewVectorStore(config: VectorStoreConfig) {
    const validatedConfig = VectorStoreConfigSchema.parse(config);

    try {
      const vectorStore = await QdrantVectorStore.fromTexts(
        [], // Empty array to create collection
        [], // Empty metadata array
        this.embeddings,
        {
          url: validatedConfig.url,
          collectionName: validatedConfig.collectionName,
          apiKey: validatedConfig.apiKey,
        }
      );

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'vector_store_created',
          collectionName: validatedConfig.collectionName,
          url: validatedConfig.url,
          isNewCollection: true,
        },
      });

      return vectorStore;
    } catch (error) {
      await analyticsService.logError(
        'vector_store_creation',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to create new vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add documents to a vector store
   */
  async addDocuments(
    vectorStore: QdrantVectorStore,
    documents: VectorDocument[],
    collectionName?: string
  ) {
    try {
      // Validate documents
      const validatedDocuments = documents.map((doc) =>
        VectorDocumentSchema.parse(doc)
      );

      // Convert to LangChain Document format
      const langchainDocuments: Document[] = validatedDocuments.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata || {},
      }));

      // Add documents to vector store
      await vectorStore.addDocuments(langchainDocuments);

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'documents_added',
          documentCount: validatedDocuments.length,
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return {
        success: true,
        documentCount: validatedDocuments.length,
      };
    } catch (error) {
      await analyticsService.logError(
        'documents_added',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for similar documents in a vector store
   */
  async searchSimilar(
    vectorStore: QdrantVectorStore,
    options: VectorSearchOptions,
    collectionName?: string
  ): Promise<VectorSearchResult[]> {
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

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'vector_search_performed',
          query: validatedOptions.query,
          resultCount: searchResults.length,
          k: validatedOptions.k,
          hasFilter: !!validatedOptions.filter,
          scoreThreshold: validatedOptions.scoreThreshold,
          collectionName: collectionName || this.defaultCollectionName,
        },
      });

      return searchResults;
    } catch (error) {
      await analyticsService.logError(
        'vector_search_performed',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to search vectors: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create embeddings for text
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'embeddings_created',
          textCount: texts.length,
          embeddingDimensions: embeddings[0]?.length || 0,
        },
      });

      return embeddings;
    } catch (error) {
      await analyticsService.logError(
        'embeddings_created',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to create embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create embedding for a single text
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);

      // Log analytics event
      await analyticsService.logCustomEvent({
        eventType: 'vector_operation',
        eventData: {
          operation: 'embedding_created',
          textLength: text.length,
          embeddingDimensions: embedding.length,
        },
      });

      return embedding;
    } catch (error) {
      await analyticsService.logError(
        'embedding_created',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      throw new Error(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get default vector store configuration
   */
  getDefaultConfig(): VectorStoreConfig {
    return {
      collectionName: this.defaultCollectionName,
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || '',
    };
  }

  /**
   * Validate vector store configuration
   */
  validateConfig(config: Partial<VectorStoreConfig>): VectorStoreConfig {
    return VectorStoreConfigSchema.parse(config);
  }
}

export const vectorService = new VectorService();
