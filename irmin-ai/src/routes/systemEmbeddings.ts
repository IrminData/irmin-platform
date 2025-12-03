import { collectionService, indexingService, retrievalService } from '@/vector';
import { FastifyInstance } from 'fastify';

import { analyticsService } from '@/services/analytics';

import { swaggerSchemas } from '@/config/swagger';

import {
  type CreateCollectionRequest,
  CreateCollectionRequestSchema,
  type CreateEmbeddingRequest,
  CreateEmbeddingRequestSchema,
  type CreateEmbeddingsRequest,
  CreateEmbeddingsRequestSchema,
  type IndexDocumentsRequest,
  IndexDocumentsRequestSchema,
  type RetrieveContextRequest,
  RetrieveContextRequestSchema,
  type SearchRequest,
  SearchRequestSchema,
  type UpdateCollectionRequest,
  UpdateCollectionRequestSchema,
} from '@/types/embeddings';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import { sendNoContentResponse } from '@/utils/responses';

interface CollectionParams {
  id: string;
}

export async function systemEmbeddingRoutes(fastify: FastifyInstance) {
  // GET /api/system/embeddings/collections - List all collections (system access)
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      activeOnly?: string;
      workspaceSlug?: string;
    };
  }>(
    '/system/embeddings/collections',
    {
      schema: swaggerSchemas.systemListEmbeddingCollections,
    },
    async (request, reply) => {
      try {
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit
          ? parseInt(request.query.limit, 10)
          : 20;
        const activeOnly = request.query.activeOnly === 'true';
        const workspaceSlug = request.query.workspaceSlug;

        if (page < 1) {
          throw new Error('Page must be at least 1');
        }
        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100');
        }

        // System can access all collections or filter by workspace
        const collections = workspaceSlug
          ? await collectionService.getCollectionsByWorkspace(workspaceSlug)
          : await collectionService.getAllCollections();

        const filteredCollections = activeOnly
          ? collections.filter((c) => c.isActive)
          : collections;

        const offset = (page - 1) * limit;
        const paginatedCollections = filteredCollections.slice(
          offset,
          offset + limit
        );

        const response = {
          data: paginatedCollections,
          pagination: {
            page,
            limit,
            total: filteredCollections.length,
            totalPages: Math.ceil(filteredCollections.length / limit),
          },
        };

        reply.send(response);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch collections';
        fastify.log.error('System list collections error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/system/embeddings/collections/:id - Get specific collection (system access)
  fastify.get<{ Params: CollectionParams }>(
    '/system/embeddings/collections/:id',
    {
      schema: swaggerSchemas.systemGetEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const collection = await collectionService.getCollectionById(id);

        if (!collection) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        reply.send(collection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch collection';
        fastify.log.error('System get collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections - Create new collection (system access)
  fastify.post<{ Body: CreateCollectionRequest }>(
    '/system/embeddings/collections',
    {
      schema: swaggerSchemas.systemCreateEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const validatedData = CreateCollectionRequestSchema.parse(request.body);

        const collectionData = {
          ...validatedData,
          // System collections can be created without workspace/user association
          workspaceSlug: validatedData.workspaceSlug || undefined,
          createdBy: undefined,
          isSystemCollection: !validatedData.workspaceSlug, // Mark as system collection if no workspace
        };

        const collection =
          await collectionService.createCollection(collectionData);

        // Log analytics
        analyticsService.logEvent({
          eventType: 'vector_store_created',
          eventData: {
            collectionName: collection.name,
            embeddingDimensions: collection.embeddingDimensions,
            isNewCollection: true,
          },
        });

        reply.send(collection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create collection';
        fastify.log.error('System create collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // PUT /api/system/embeddings/collections/:id - Update collection (system access)
  fastify.put<{
    Params: CollectionParams;
    Body: UpdateCollectionRequest;
  }>(
    '/system/embeddings/collections/:id',
    {
      schema: swaggerSchemas.systemUpdateEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = UpdateCollectionRequestSchema.parse(request.body);

        const updatedCollection = await collectionService.updateCollection(
          id,
          validatedData
        );

        if (!updatedCollection) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        // Log analytics
        analyticsService.logEvent({
          eventType: 'vector_store_updated',
          eventData: {
            collectionName: updatedCollection.name,
            embeddingDimensions: updatedCollection.embeddingDimensions,
            isNewCollection: false,
          },
        });

        reply.send(updatedCollection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update collection';
        fastify.log.error('System update collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // DELETE /api/system/embeddings/collections/:id - Delete collection (system access)
  fastify.delete<{ Params: CollectionParams }>(
    '/system/embeddings/collections/:id',
    {
      schema: swaggerSchemas.systemDeleteEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Get collection data before deletion for logging
        const collection = await collectionService.getCollectionById(id);
        if (!collection) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        const success = await collectionService.deleteCollection(id);

        if (!success) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        // Log analytics
        analyticsService.logEvent({
          eventType: 'vector_store_deleted',
          eventData: {
            collectionName: collection.name,
            embeddingDimensions: collection.embeddingDimensions,
            isNewCollection: false,
          },
        });

        sendNoContentResponse(reply);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to delete collection';
        fastify.log.error('System delete collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections/:id/documents - Index documents in collection (system access)
  fastify.post<{
    Params: CollectionParams;
    Body: IndexDocumentsRequest;
  }>(
    '/system/embeddings/collections/:id/documents',
    {
      schema: swaggerSchemas.indexDocuments,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = IndexDocumentsRequestSchema.parse(request.body);

        // Get collection config
        const collectionConfig =
          await collectionService.getCollectionConfig(id);
        if (!collectionConfig) {
          sendNotFoundError(
            reply,
            'Collection not found or inactive',
            fastify.log
          );
          return;
        }

        // Create vector store connection
        const collectionName = await indexingService.validateCollectionAccess(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          collectionConfig.workspaceSlug ?? undefined,
          collectionConfig.createdBy ?? undefined
        );

        // Index documents
        const result = await indexingService.indexDocuments(
          collectionName,
          validatedData.documents
        );

        // Log analytics
        analyticsService.logEvent({
          eventType: 'documents_indexed',
          eventData: {
            documentCount: result.documentCount,
            collectionName: result.collectionName,
          },
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to index documents';
        fastify.log.error('System index documents error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections/:id/search - Search in collection (system access)
  fastify.post<{
    Params: CollectionParams;
    Body: SearchRequest;
  }>(
    '/system/embeddings/collections/:id/search',
    {
      schema: swaggerSchemas.searchEmbeddings,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = SearchRequestSchema.parse(request.body);

        // Get collection config
        const collectionConfig =
          await collectionService.getCollectionConfig(id);
        if (!collectionConfig) {
          sendNotFoundError(
            reply,
            'Collection not found or inactive',
            fastify.log
          );
          return;
        }

        // Create vector store connection
        const collectionName = await indexingService.validateCollectionAccess(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          collectionConfig.workspaceSlug ?? undefined,
          collectionConfig.createdBy ?? undefined
        );

        // Perform search
        const result = await retrievalService.searchSimilar(
          collectionName,
          validatedData
        );

        // Log analytics
        analyticsService.logEvent({
          eventType: 'similarity_search',
          eventData: {
            query: validatedData.query,
            resultCount: result.totalResults,
            processingTimeMs: result.processingTime,
            collectionName: collectionConfig.name,
            k: validatedData.k,
            hasFilter: !!validatedData.filter,
            scoreThreshold: validatedData.scoreThreshold,
          },
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to search';
        fastify.log.error('System search error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections/:id/retrieve-context - Retrieve context for generation (system access)
  fastify.post<{
    Params: CollectionParams;
    Body: RetrieveContextRequest;
  }>(
    '/system/embeddings/collections/:id/retrieve-context',
    {
      schema: swaggerSchemas.retrieveContext,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = RetrieveContextRequestSchema.parse(request.body);

        // Get collection config
        const collectionConfig =
          await collectionService.getCollectionConfig(id);
        if (!collectionConfig) {
          sendNotFoundError(
            reply,
            'Collection not found or inactive',
            fastify.log
          );
          return;
        }

        // Create vector store connection
        const collectionName = await indexingService.validateCollectionAccess(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          collectionConfig.workspaceSlug ?? undefined,
          collectionConfig.createdBy ?? undefined
        );

        // Retrieve context
        const result = await retrievalService.retrieveContext(
          collectionName,
          validatedData.query,
          {
            maxDocuments: validatedData.maxDocuments,
            scoreThreshold: validatedData.scoreThreshold,
            includeMetadata: validatedData.includeMetadata,
            maxTokens: validatedData.maxTokens,
          }
        );

        // Log analytics
        analyticsService.logEvent({
          eventType: 'context_retrieved',
          eventData: {
            query: validatedData.query,
            sourcesCount: result.sources.length,
            estimatedTokens: result.totalTokens,
            collectionName: collectionConfig.name,
          },
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to retrieve context';
        fastify.log.error('System retrieve context error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections/:id/create - Create single embedding using collection's model (system access)
  fastify.post<{
    Params: CollectionParams;
    Body: CreateEmbeddingRequest;
  }>(
    '/system/embeddings/collections/:id/create',
    {
      schema: swaggerSchemas.createEmbedding,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = CreateEmbeddingRequestSchema.parse(request.body);

        // Get collection config to use its embedding model
        const collectionConfig =
          await collectionService.getCollectionConfig(id);
        if (!collectionConfig) {
          sendNotFoundError(
            reply,
            'Collection not found or inactive',
            fastify.log
          );
          return;
        }

        // Create embedding using the collection's embedding model
        const embedding = await indexingService.createEmbedding(
          validatedData.text,
          collectionConfig.embeddingModel
        );

        const result = {
          embedding,
          text: validatedData.text,
          metadata: validatedData.metadata,
          dimensions: embedding.length,
          collectionId: id,
          embeddingModel: collectionConfig.embeddingModel,
        };

        // Log analytics
        analyticsService.logEvent({
          eventType: 'embedding_created',
          eventData: {
            textLength: validatedData.text.length,
            embeddingDimensions: embedding.length,
            collectionName: collectionConfig.name,
          },
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to create embedding';
        fastify.log.error('System create embedding error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/system/embeddings/collections/:id/create-batch - Create multiple embeddings using collection's model (system access)
  fastify.post<{
    Params: CollectionParams;
    Body: CreateEmbeddingsRequest;
  }>(
    '/system/embeddings/collections/:id/create-batch',
    {
      schema: swaggerSchemas.createEmbeddings,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = CreateEmbeddingsRequestSchema.parse(request.body);

        // Get collection config to use its embedding model
        const collectionConfig =
          await collectionService.getCollectionConfig(id);
        if (!collectionConfig) {
          sendNotFoundError(
            reply,
            'Collection not found or inactive',
            fastify.log
          );
          return;
        }

        // Create embeddings using the collection's embedding model
        const embeddings = await indexingService.createEmbeddings(
          validatedData.texts,
          collectionConfig.embeddingModel
        );

        const result = {
          embeddings,
          texts: validatedData.texts,
          metadata: validatedData.metadata,
          count: embeddings.length,
          dimensions: embeddings[0]?.length || 0,
          collectionId: id,
          embeddingModel: collectionConfig.embeddingModel,
        };

        // Log analytics
        analyticsService.logEvent({
          eventType: 'embeddings_created',
          eventData: {
            textCount: validatedData.texts.length,
            embeddingDimensions: embeddings[0]?.length || 0,
            collectionName: collectionConfig.name,
          },
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create embeddings';
        fastify.log.error('System create embeddings error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
