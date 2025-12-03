import { type VectorCollection } from '@/database';
import { OpenAIEmbeddings } from '@langchain/openai';
import { z } from 'zod';

import { analyticsService } from '@/services/analytics';

import { env } from '@/config/env';

import { qdrantService } from './QdrantService';
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

export interface CreateVectorStoreOptions {
  collectionName: string;
  description?: string;
  workspaceSlug?: string;
  userId?: string;
  isSystemCollection?: boolean;
  embeddingModel?: string;
  embeddingDimensions?: number;
}

/**
 * System collections that should exist in the application
 */
const SYSTEM_COLLECTIONS = [
  {
    name: 'irmin-docs',
    description: 'Auto-generated collection for Irmin SDK documentation',
  },
  {
    name: 'duckdb-sql-syntax-docs',
    description: 'Auto-generated collection for DuckDB SQL documentation',
  },
] as const;

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
   * Validate access to a collection and return its name
   */
  async validateCollectionAccess(
    collectionName: string,
    isSystemCollection?: boolean,
    workspaceSlug?: string,
    userId?: string
  ): Promise<string> {
    try {
      // First, try to get the collection from the database
      // The service filters by workspace, user, and system flag, so we don't need manual checks
      const collection = await collectionService.getCollectionByName(
        collectionName,
        workspaceSlug,
        userId,
        isSystemCollection
      );

      if (!collection) {
        throw new Error('Collection not found or access denied');
      }

      // Verify it exists in Qdrant
      const exists = await qdrantService.collectionExists(collectionName);
      if (!exists) {
        throw new Error(
          `Collection ${collectionName} does not exist in vector store`
        );
      }

      return collectionName;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'vector_store_connection',
        eventData: {
          collectionName: collectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      // Preserve the original error by wrapping it with cause
      const wrappedError = new Error(
        `Failed to access vector store: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
      throw wrappedError;
    }
  }

  /**
   * Create a new collection and vector store
   * Consolidates logic for creating both Database record and Qdrant collection
   */
  async createVectorStore(
    options: CreateVectorStoreOptions
  ): Promise<VectorCollection> {
    const {
      collectionName,
      description,
      workspaceSlug,
      userId,
      isSystemCollection = false,
      embeddingModel = 'text-embedding-3-small',
      embeddingDimensions = 1536,
    } = options;

    try {
      // Create collection in database first
      const collection = await collectionService.createCollection({
        name: collectionName,
        description:
          description ||
          `${isSystemCollection ? 'System' : 'Vector'} collection created on ${new Date().toISOString()}`,
        embeddingModel,
        embeddingDimensions,
        workspaceSlug: workspaceSlug ?? undefined,
        createdBy: userId ?? undefined,
        isSystemCollection,
      });

      // Create in Qdrant
      // If Qdrant creation fails, we should technically rollback DB, but soft failure is often acceptable if handled later
      // For now, we let it throw so the caller knows it failed
      await qdrantService.createCollection(collectionName, embeddingDimensions);

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'vector_store_created',
        eventData: {
          collectionName: collectionName,
          url: env.QDRANT_URL,
          isNewCollection: true,
          isSystemCollection,
        },
      });

      return collection;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'vector_store_creation',
        eventData: {
          collectionName: collectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to create vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new collection and vector store
   * @deprecated Use createVectorStore instead
   */
  async createNewVectorStore(
    collectionName: string,
    workspaceSlug: string,
    userId: string,
    description?: string
  ): Promise<string> {
    const collection = await this.createVectorStore({
      collectionName,
      workspaceSlug,
      userId,
      description,
      isSystemCollection: false,
    });
    return collection.name;
  }

  /**
   * Create a new system collection and vector store
   * @deprecated Use createVectorStore instead
   */
  async createSystemVectorStore(
    collectionName: string,
    description?: string
  ): Promise<string> {
    const collection = await this.createVectorStore({
      collectionName,
      description,
      isSystemCollection: true,
    });
    return collection.name;
  }

  /**
   * Add documents to a vector store (indexing step)
   */
  async indexDocuments(
    collectionName: string,
    documents: VectorDocument[]
  ): Promise<IndexingResult> {
    try {
      // Validate documents
      const validatedDocuments = documents.map((doc) =>
        VectorDocumentSchema.parse(doc)
      );

      // 1. Generate embeddings
      const texts = validatedDocuments.map((doc) => doc.pageContent);
      const embeddings = await this.embeddings.embedDocuments(texts);

      // 2. Prepare points for Qdrant
      const points = validatedDocuments.map((doc, index) => ({
        vector: embeddings[index],
        payload: {
          content: doc.pageContent,
          metadata: doc.metadata || {},
        },
      }));

      // 3. Upsert points
      const finalCollectionName = collectionName || this.defaultCollectionName;
      await qdrantService.upsertPoints(finalCollectionName, points);

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
      analyticsService.logEvent({
        eventType: 'documents_indexed',
        eventData: {
          documentCount: validatedDocuments.length,
          collectionName: result.collectionName,
        },
      });

      return result;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'documents_indexing',
        eventData: {
          collectionName: collectionName || this.defaultCollectionName,
          documentCount: documents.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
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
      analyticsService.logEvent({
        eventType: 'embeddings_created',
        eventData: {
          textCount: texts.length,
          embeddingDimensions: embeddingResults[0]?.length || 0,
        },
      });

      return embeddingResults;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'embeddings_creation',
        eventData: {
          textCount: texts.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
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
      analyticsService.logEvent({
        eventType: 'embedding_created',
        eventData: {
          textLength: text.length,
          embeddingDimensions: embedding.length,
        },
      });

      return embedding;
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'embedding_creation',
        eventData: {
          textLength: text.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
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
    collectionName: string
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
      await qdrantService.deletePoints(finalCollectionName, {});

      // Since we deleted all documents, set the count to 0
      if (collection) {
        await collectionService.updateCollectionStats(collection.id, {
          documentCount: 0,
          lastIndexedAt: new Date(),
        });
      }

      deletedCount = initialCount;

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'documents_deleted',
        eventData: {
          documentCount: deletedCount,
          collectionName: finalCollectionName,
          errorCount: errors.length,
        },
      });

      return {
        success: true,
        deletedCount,
        errors,
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'documents_deletion',
        eventData: {
          collectionName: collectionName || this.defaultCollectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to delete all documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete specific chunks from a vector store by chunk IDs
   */
  async deleteSpecificChunks(
    collectionName: string,
    chunkIds: string[]
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deletedCount = 0;
      const finalCollectionName = collectionName || this.defaultCollectionName;

      // Delete each chunk by its specific documentId
      for (const chunkId of chunkIds) {
        try {
          await qdrantService.deletePoints(finalCollectionName, {
            must: [
              {
                key: 'metadata.documentId',
                match: { value: chunkId },
              },
            ],
          });
          deletedCount++;
        } catch (error) {
          const errorMessage = `Failed to delete chunk ${chunkId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Update collection statistics in database
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      if (collection && deletedCount > 0) {
        await collectionService.decrementDocumentCount(
          collection.id,
          deletedCount
        );
      }

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'documents_deleted',
        eventData: {
          documentCount: deletedCount,
          collectionName: finalCollectionName,
          errorCount: errors.length,
        },
      });

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'documents_deletion',
        eventData: {
          collectionName: collectionName || this.defaultCollectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to delete specific chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete documents from a vector store by document IDs
   */
  async deleteDocuments(
    collectionName: string,
    documentIds: string[]
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deletedCount = 0;
      const finalCollectionName = collectionName || this.defaultCollectionName;

      // First, get all chunk document IDs that need to be deleted
      const allChunkIds: string[] = [];
      for (const baseDocId of documentIds) {
        try {
          // Get all points that match this base document ID using range filter for prefix matching
          // Since chunk IDs are formatted as baseDocId-chunk-N, we need to use a range filter
          // to match all strings that start with the base document ID
          const result = await qdrantService.scroll(
            finalCollectionName,
            {
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
            1000
          );

          if (result.points) {
            for (const point of result.points) {
              const payload = point.payload as
                | Record<string, unknown>
                | undefined;
              const metadata = payload?.metadata as
                | Record<string, unknown>
                | undefined;

              if (metadata && typeof metadata.documentId === 'string') {
                const chunkDocId = metadata.documentId;
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
          await qdrantService.deletePoints(finalCollectionName, {
            must: [
              {
                key: 'metadata.documentId',
                match: { value: chunkDocId },
              },
            ],
          });
          deletedCount++;
        } catch (error) {
          const errorMessage = `Failed to delete chunk ${chunkDocId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Update collection statistics in database
      const collection =
        await collectionService.getCollectionByName(finalCollectionName);
      if (collection && deletedCount > 0) {
        await collectionService.decrementDocumentCount(
          collection.id,
          deletedCount
        );
      }

      // Log vector operation
      analyticsService.logEvent({
        eventType: 'documents_deleted',
        eventData: {
          documentCount: deletedCount,
          collectionName: finalCollectionName,
          documentIds: documentIds,
          errorCount: errors.length,
        },
      });

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
      };
    } catch (error) {
      analyticsService.logEvent({
        eventType: 'documents_deletion',
        eventData: {
          collectionName: collectionName || this.defaultCollectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new Error(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure all system collections exist
   * Creates collections in both the database and Qdrant if they don't exist
   */
  async ensureSystemCollections() {
    console.log('Ensuring system collections exist...');

    for (const { name, description } of SYSTEM_COLLECTIONS) {
      try {
        // Check if collection exists in database
        const existingCollection = await collectionService.getCollectionByName(
          name,
          undefined,
          undefined,
          true
        );

        if (existingCollection) {
          // Collection exists in DB, verify/ensure it exists in Qdrant
          // Using suppressConnectionErrors=true to allow startup even if Qdrant is down
          await qdrantService.ensureCollection(name, 1536, true);
          console.log(`System collection '${name}' checked/synced`);
        } else {
          // Create new system collection
          console.log(`Creating system collection '${name}'...`);
          try {
            await this.createVectorStore({
              collectionName: name,
              description,
              isSystemCollection: true,
            });
            console.log(`System collection '${name}' created successfully`);
          } catch (createError) {
            const createErrorMsg =
              createError instanceof Error
                ? createError.message
                : 'Unknown error';
            if (createErrorMsg.includes('already exists')) {
              console.log(
                `System collection '${name}' already exists in Qdrant (but was missing in DB, now created in DB)`
              );
            } else {
              throw createError;
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to ensure system collection '${name}':`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Don't throw - allow server to start even if collection creation fails
      }
    }

    console.log('System collections check completed');
  }
}

export const indexingService = new IndexingService();
export type { VectorDocument, IndexingResult };
