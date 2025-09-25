import type { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { z } from 'zod';

import { analyticsService } from '@/services/analytics';

import { env } from '@/config/env';

import { collectionService } from './vectorCollections';

// Zod schemas for type safety
const VectorDocumentSchema = z.object({
  pageContent: z.string().min(1, 'Page content cannot be empty'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const VectorStoreConfigSchema = z.object({
  collectionName: z.string().min(1, 'Collection name cannot be empty'),
  url: z.string().min(1, 'Qdrant URL is required').default(env.QDRANT_URL),
  apiKey: z
    .string()
    .optional()
    .default(env.QDRANT_API_KEY || ''),
});

type VectorDocument = z.infer<typeof VectorDocumentSchema>;
type VectorStoreConfig = z.infer<typeof VectorStoreConfigSchema>;

interface IndexingResult {
  success: boolean;
  documentCount: number;
  collectionName: string;
}

/**
 * IndexingService handles the "Indexing" part of RAG:
 * 1. Loading documents
 * 2. Splitting documents into chunks
 * 3. Creating embeddings
 * 4. Storing documents in vector store
 */
class IndexingService {
  private embeddings: OpenAIEmbeddings;
  private defaultCollectionName = 'irmin-documents';

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });
  }

  /**
   * Create a new vector store instance from existing collection
   */
  async createVectorStore(
    config: VectorStoreConfig,
    workspaceSlug?: string,
    userId?: string
  ): Promise<QdrantVectorStore> {
    const validatedConfig = VectorStoreConfigSchema.parse(config);

    try {
      // First, try to get the collection from the database
      let collection = await collectionService.getCollectionByName(
        validatedConfig.collectionName
      );

      if (!collection) {
        // Collection doesn't exist in DB, create it
        if (!workspaceSlug || !userId) {
          throw new Error(
            'Workspace slug and user ID are required to create a new collection'
          );
        }

        collection = await collectionService.createCollection({
          name: validatedConfig.collectionName,
          vectorStoreUrl: validatedConfig.url,
          vectorStoreApiKey: validatedConfig.apiKey,
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: 1536,
          workspaceSlug,
          createdBy: userId,
          isSystemCollection: false,
          description: `Vector collection created automatically`,
        });
      }

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          url: validatedConfig.url,
          collectionName: validatedConfig.collectionName,
          apiKey: validatedConfig.apiKey,
        }
      );

      // Log vector operation
      await analyticsService.logVectorIndexing('vector_store_connected', {
        collectionName: validatedConfig.collectionName,
        url: validatedConfig.url,
      });

      return vectorStore;
    } catch (error) {
      await analyticsService.logVectorError(
        'vector_store_connection',
        error instanceof Error ? error.message : 'Unknown error',
        { collectionName: validatedConfig.collectionName }
      );
      throw new Error(
        `Failed to connect to vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new collection and vector store
   */
  async createNewVectorStore(
    config: VectorStoreConfig,
    workspaceSlug: string,
    userId: string,
    description?: string
  ): Promise<QdrantVectorStore> {
    const validatedConfig = VectorStoreConfigSchema.parse(config);

    try {
      // Create collection in database first
      await collectionService.createCollection({
        name: validatedConfig.collectionName,
        description:
          description ||
          `Vector collection created on ${new Date().toISOString()}`,
        vectorStoreUrl: validatedConfig.url,
        vectorStoreApiKey: validatedConfig.apiKey,
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 1536,
        workspaceSlug,
        createdBy: userId,
        isSystemCollection: false,
      });

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

      // Log vector operation
      await analyticsService.logVectorIndexing('vector_store_created', {
        collectionName: validatedConfig.collectionName,
        url: validatedConfig.url,
        isNewCollection: true,
      });

      return vectorStore;
    } catch (error) {
      await analyticsService.logVectorError(
        'vector_store_creation',
        error instanceof Error ? error.message : 'Unknown error',
        { collectionName: validatedConfig.collectionName }
      );
      throw new Error(
        `Failed to create new vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add documents to a vector store (indexing step)
   */
  async indexDocuments(
    vectorStore: QdrantVectorStore,
    documents: VectorDocument[],
    collectionName?: string
  ): Promise<IndexingResult> {
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

      // Add documents to vector store (this creates embeddings and stores them)
      await vectorStore.addDocuments(langchainDocuments);

      const finalCollectionName = collectionName || this.defaultCollectionName;
      const result: IndexingResult = {
        success: true,
        documentCount: validatedDocuments.length,
        collectionName: finalCollectionName,
      };

      // Update collection statistics in database
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      if (collection) {
        await collectionService.incrementDocumentCount(
          collection.id,
          validatedDocuments.length
        );
      }

      // Log vector operation
      await analyticsService.logVectorIndexing('documents_indexed', {
        documentCount: validatedDocuments.length,
        collectionName: result.collectionName,
      });

      return result;
    } catch (error) {
      await analyticsService.logVectorError(
        'documents_indexing',
        error instanceof Error ? error.message : 'Unknown error',
        { documentCount: documents.length }
      );
      throw new Error(
        `Failed to index documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create embeddings for text chunks (useful for batch processing)
   */
  async createEmbeddings(texts: string[], model?: string): Promise<number[][]> {
    try {
      const embeddings =
        model && model !== 'text-embedding-3-small'
          ? new OpenAIEmbeddings({
              apiKey: env.OPENAI_API_KEY,
              model: model,
            })
          : this.embeddings;

      const embeddingResults = await embeddings.embedDocuments(texts);

      // Log vector operation
      await analyticsService.logVectorIndexing('embeddings_created', {
        textCount: texts.length,
        embeddingDimensions: embeddingResults[0]?.length || 0,
      });

      return embeddingResults;
    } catch (error) {
      await analyticsService.logVectorError(
        'embeddings_creation',
        error instanceof Error ? error.message : 'Unknown error',
        { textCount: texts.length }
      );
      throw new Error(
        `Failed to create embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create embedding for a single text (useful for queries)
   */
  async createEmbedding(text: string, model?: string): Promise<number[]> {
    try {
      const embeddings =
        model && model !== 'text-embedding-3-small'
          ? new OpenAIEmbeddings({
              apiKey: env.OPENAI_API_KEY,
              model: model,
            })
          : this.embeddings;

      const embedding = await embeddings.embedQuery(text);

      // Log vector operation
      await analyticsService.logVectorIndexing('embedding_created', {
        textLength: text.length,
        embeddingDimensions: embedding.length,
      });

      return embedding;
    } catch (error) {
      await analyticsService.logVectorError(
        'embedding_creation',
        error instanceof Error ? error.message : 'Unknown error',
        { textLength: text.length }
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

  /**
   * Get embedding model instance (useful for custom operations)
   */
  getEmbeddingModel(): OpenAIEmbeddings {
    return this.embeddings;
  }

  /**
   * Get collection by name from database
   */
  async getCollectionByName(name: string) {
    return await collectionService.getCollectionByName(name);
  }

  /**
   * Get collections for a workspace
   */
  async getCollectionsByWorkspace(workspaceSlug: string) {
    return await collectionService.getActiveCollectionsByWorkspace(
      workspaceSlug
    );
  }

  /**
   * Create a collection with proper database tracking
   */
  async createCollection(
    name: string,
    workspaceSlug: string,
    userId: string,
    options: {
      description?: string;
      vectorStoreUrl?: string;
      vectorStoreApiKey?: string;
      embeddingModel?: string;
      embeddingDimensions?: number;
    } = {}
  ) {
    const config = {
      name,
      description: options.description,
      vectorStoreUrl: options.vectorStoreUrl || env.QDRANT_URL,
      vectorStoreApiKey: options.vectorStoreApiKey || env.QDRANT_API_KEY || '',
      embeddingModel: options.embeddingModel || 'text-embedding-3-small',
      embeddingDimensions: options.embeddingDimensions || 1536,
      workspaceSlug,
      createdBy: userId,
      isSystemCollection: false,
    };

    return await collectionService.createCollection(config);
  }

  /**
   * Update collection configuration
   */
  async updateCollection(
    collectionId: string,
    updates: {
      name?: string;
      description?: string;
      vectorStoreUrl?: string;
      vectorStoreApiKey?: string;
      embeddingModel?: string;
      embeddingDimensions?: number;
      isActive?: boolean;
    }
  ) {
    return await collectionService.updateCollection(collectionId, updates);
  }

  /**
   * Delete a collection (soft delete)
   */
  async deleteCollection(collectionId: string) {
    return await collectionService.deleteCollection(collectionId);
  }
}

export const indexingService = new IndexingService();
export type { VectorDocument, VectorStoreConfig, IndexingResult };
