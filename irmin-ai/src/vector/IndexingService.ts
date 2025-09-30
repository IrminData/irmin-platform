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

type VectorDocument = z.infer<typeof VectorDocumentSchema>;

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
  async initVectorStore(
    collectionName: string,
    isSystemCollection?: boolean,
    workspaceSlug?: string,
    userId?: string
  ): Promise<QdrantVectorStore> {
    try {
      // First, try to get the collection from the database
      const collection =
        await collectionService.getCollectionByName(collectionName);

      if (!collection) {
        throw new Error('Collection not found');
      }

      if (workspaceSlug && collection.workspaceSlug !== workspaceSlug) {
        throw new Error(
          'Collection does not belong to the specified workspace'
        );
      }

      if (userId && collection.createdBy !== userId) {
        throw new Error('Collection does not belong to the specified user');
      }

      if (isSystemCollection && !collection.isSystemCollection) {
        throw new Error('Collection is not a system collection');
      }

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          url: env.QDRANT_URL,
          collectionName: collectionName,
          apiKey: env.QDRANT_API_KEY || '',
        }
      );

      return vectorStore;
    } catch (error) {
      await analyticsService.logVectorError(
        'vector_store_connection',
        error instanceof Error ? error.message : 'Unknown error',
        { collectionName: collectionName }
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
    collectionName: string,
    workspaceSlug: string,
    userId: string,
    description?: string
  ): Promise<QdrantVectorStore> {
    try {
      // Create collection in database first
      await collectionService.createCollection({
        name: collectionName,
        description:
          description ||
          `Vector collection created on ${new Date().toISOString()}`,
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
          url: env.QDRANT_URL,
          collectionName: collectionName,
          apiKey: env.QDRANT_API_KEY || '',
        }
      );

      // Log vector operation
      await analyticsService.logVectorIndexing('vector_store_created', {
        collectionName: collectionName,
        url: env.QDRANT_URL,
        isNewCollection: true,
      });

      return vectorStore;
    } catch (error) {
      await analyticsService.logVectorError(
        'vector_store_creation',
        error instanceof Error ? error.message : 'Unknown error',
        { collectionName: collectionName }
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
   * Get embedding model instance (useful for custom operations)
   */
  getEmbeddingModel(): OpenAIEmbeddings {
    return this.embeddings;
  }

  /**
   * Delete all documents from a vector store collection
   */
  async deleteAllDocuments(
    vectorStore: QdrantVectorStore,
    collectionName?: string
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deletedCount = 0;

      const finalCollectionName = collectionName || this.defaultCollectionName;

      // Get the current document count before deletion
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      const initialCount = collection?.documentCount || 0;

      // Delete all points from the collection using an empty filter (matches all)
      await vectorStore.client.delete(finalCollectionName, {
        filter: {}, // Empty filter matches all points
      });

      // Since we deleted all documents, set the count to 0
      if (collection) {
        await collectionService.updateCollectionStats(collection.id, {
          documentCount: 0,
          lastIndexedAt: new Date(),
        });
      }

      deletedCount = initialCount;

      // Log vector operation
      await analyticsService.logVectorIndexing('documents_deleted', {
        documentCount: deletedCount,
        collectionName: finalCollectionName,
        errorCount: errors.length,
      });

      return {
        success: true,
        deletedCount,
        errors,
      };
    } catch (error) {
      await analyticsService.logVectorError(
        'documents_deletion',
        error instanceof Error ? error.message : 'Unknown error',
        { collectionName: collectionName || this.defaultCollectionName }
      );
      throw new Error(
        `Failed to delete all documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete specific chunks from a vector store by chunk IDs
   */
  async deleteSpecificChunks(
    vectorStore: QdrantVectorStore,
    chunkIds: string[],
    collectionName?: string
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deletedCount = 0;

      // Delete each chunk by its specific documentId
      for (const chunkId of chunkIds) {
        try {
          await vectorStore.client.delete(
            collectionName || this.defaultCollectionName,
            {
              filter: {
                must: [
                  {
                    key: 'metadata.documentId',
                    match: { value: chunkId },
                  },
                ],
              },
            }
          );
          deletedCount++;
        } catch (error) {
          const errorMessage = `Failed to delete chunk ${chunkId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Update collection statistics in database
      const finalCollectionName = collectionName || this.defaultCollectionName;
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      if (collection && deletedCount > 0) {
        await collectionService.decrementDocumentCount(
          collection.id,
          deletedCount
        );
      }

      // Log vector operation
      await analyticsService.logVectorIndexing('documents_deleted', {
        documentCount: deletedCount,
        collectionName: finalCollectionName,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
      };
    } catch (error) {
      await analyticsService.logVectorError(
        'documents_deletion',
        error instanceof Error ? error.message : 'Unknown error',
        { documentCount: chunkIds.length }
      );
      throw new Error(
        `Failed to delete specific chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete documents from a vector store by document IDs
   */
  async deleteDocuments(
    vectorStore: QdrantVectorStore,
    documentIds: string[],
    collectionName?: string
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deletedCount = 0;

      // First, get all chunk document IDs that need to be deleted
      const allChunkIds: string[] = [];
      for (const baseDocId of documentIds) {
        try {
          // Get all points that match this base document ID using range filter for prefix matching
          // Since chunk IDs are formatted as baseDocId-chunk-N, we need to use a range filter
          // to match all strings that start with the base document ID
          const points = await vectorStore.client.scroll(
            collectionName || this.defaultCollectionName,
            {
              filter: {
                must: [
                  {
                    key: 'metadata.documentId',
                    range: {
                      gte: baseDocId,
                      lt: baseDocId + '\xFF', // Use \xFF to create upper bound for prefix matching
                    },
                  },
                ],
              },
              limit: 1000,
              with_payload: true,
              with_vector: false,
            }
          );

          if (points.points) {
            for (const point of points.points) {
              if (
                point.payload &&
                typeof point.payload === 'object' &&
                'metadata' in point.payload &&
                point.payload.metadata &&
                typeof point.payload.metadata === 'object' &&
                'documentId' in point.payload.metadata
              ) {
                const chunkDocId = point.payload.metadata.documentId as string;
                // Double-check that the chunk ID starts with the base document ID
                if (chunkDocId && chunkDocId.startsWith(baseDocId)) {
                  allChunkIds.push(chunkDocId);
                }
              }
            }
          }
        } catch (error) {
          const errorMessage = `Failed to get chunks for document ${baseDocId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Now delete all the chunk document IDs
      for (const chunkDocId of allChunkIds) {
        try {
          await vectorStore.client.delete(
            collectionName || this.defaultCollectionName,
            {
              filter: {
                must: [
                  {
                    key: 'metadata.documentId',
                    match: { value: chunkDocId },
                  },
                ],
              },
            }
          );
          deletedCount++;
        } catch (error) {
          const errorMessage = `Failed to delete chunk ${chunkDocId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Update collection statistics in database
      const finalCollectionName = collectionName || this.defaultCollectionName;
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      if (collection && deletedCount > 0) {
        await collectionService.decrementDocumentCount(
          collection.id,
          deletedCount
        );
      }

      // Log vector operation
      await analyticsService.logVectorIndexing('documents_deleted', {
        documentCount: deletedCount,
        collectionName: finalCollectionName,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
      };
    } catch (error) {
      await analyticsService.logVectorError(
        'documents_deletion',
        error instanceof Error ? error.message : 'Unknown error',
        { documentCount: documentIds.length }
      );
      throw new Error(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const indexingService = new IndexingService();
export type { VectorDocument, IndexingResult };
