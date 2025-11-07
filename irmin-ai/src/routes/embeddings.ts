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

export async function embeddingRoutes(fastify: FastifyInstance) {
  // GET /api/embeddings/collections - List all collections for workspace
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      activeOnly?: string;
    };
  }>(
    '/embeddings/collections',
    {
      schema: swaggerSchemas.listEmbeddingCollections,
    },
    async (request, reply) => {
      try {
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit
          ? parseInt(request.query.limit, 10)
          : 20;
        const activeOnly = request.query.activeOnly === 'true';

        if (page < 1) {
          throw new Error('Page must be at least 1');
        }
        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100');
        }

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const collections = activeOnly
          ? await collectionService.getActiveCollectionsByWorkspace(
              workspaceContext.slug
            )
          : await collectionService.getCollectionsByWorkspace(
              workspaceContext.slug
            );

        const offset = (page - 1) * limit;
        const paginatedCollections = collections.slice(offset, offset + limit);

        const response = {
          data: paginatedCollections,
          pagination: {
            page,
            limit,
            total: collections.length,
            totalPages: Math.ceil(collections.length / limit),
          },
        };

        reply.send(response);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch collections';
        fastify.log.error('List collections error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/embeddings/collections/:id - Get specific collection
  fastify.get<{ Params: CollectionParams }>(
    '/embeddings/collections/:id',
    {
      schema: swaggerSchemas.getEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const collection = await collectionService.getCollectionById(id);

        if (!collection) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        reply.send(collection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch collection';
        fastify.log.error('Get collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections - Create new collection
  fastify.post<{ Body: CreateCollectionRequest }>(
    '/embeddings/collections',
    {
      schema: swaggerSchemas.createEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const validatedData = CreateCollectionRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const collectionData = {
          ...validatedData,
          workspaceSlug: workspaceContext.slug,
          createdBy: authContext.user.id,
          isSystemCollection: false,
        };

        const collection =
          await collectionService.createCollection(collectionData);

        // Log analytics
        analyticsService.logVectorIndexing('vector_store_created', {
          collectionName: collection.name,
          embeddingDimensions: collection.embeddingDimensions,
          isNewCollection: true,
        });

        reply.send(collection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create collection';
        fastify.log.error('Create collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // PUT /api/embeddings/collections/:id - Update collection
  fastify.put<{
    Params: CollectionParams;
    Body: UpdateCollectionRequest;
  }>(
    '/embeddings/collections/:id',
    {
      schema: swaggerSchemas.updateEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = UpdateCollectionRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        const updatedCollection = await collectionService.updateCollection(
          id,
          validatedData
        );

        if (!updatedCollection) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

        // Log analytics
        analyticsService.logVectorIndexing('vector_store_updated', {
          collectionName: updatedCollection.name,
          embeddingDimensions: updatedCollection.embeddingDimensions,
          isNewCollection: false,
        });

        reply.send(updatedCollection);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update collection';
        fastify.log.error('Update collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // DELETE /api/embeddings/collections/:id - Delete collection
  fastify.delete<{ Params: CollectionParams }>(
    '/embeddings/collections/:id',
    {
      schema: swaggerSchemas.deleteEmbeddingCollection,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        analyticsService.logVectorIndexing('vector_store_deleted', {
          collectionName: collection.name,
          embeddingDimensions: collection.embeddingDimensions,
          isNewCollection: false,
        });

        sendNoContentResponse(reply);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to delete collection';
        fastify.log.error('Delete collection error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections/:id/documents - Index documents in collection
  fastify.post<{
    Params: CollectionParams;
    Body: IndexDocumentsRequest;
  }>(
    '/embeddings/collections/:id/documents',
    {
      schema: swaggerSchemas.indexDocuments,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = IndexDocumentsRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        const vectorStore = await indexingService.initVectorStore(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          workspaceContext.slug,
          authContext.user.id
        );

        // Index documents
        const result = await indexingService.indexDocuments(
          vectorStore,
          validatedData.documents,
          collectionConfig.name
        );

        // Log analytics
        analyticsService.logVectorIndexing('documents_indexed', {
          documentCount: result.documentCount,
          collectionName: result.collectionName,
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to index documents';
        fastify.log.error('Index documents error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections/:id/search - Search in collection
  fastify.post<{
    Params: CollectionParams;
    Body: SearchRequest;
  }>(
    '/embeddings/collections/:id/search',
    {
      schema: swaggerSchemas.searchEmbeddings,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = SearchRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        const vectorStore = await indexingService.initVectorStore(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          workspaceContext.slug,
          authContext.user.id
        );

        // Perform search
        const result = await retrievalService.searchSimilar(
          vectorStore,
          validatedData,
          collectionConfig.name
        );

        // Log analytics
        analyticsService.logVectorRetrieval('similarity_search', {
          query: validatedData.query,
          resultCount: result.totalResults,
          processingTimeMs: result.processingTime,
          collectionName: collectionConfig.name,
          k: validatedData.k,
          hasFilter: !!validatedData.filter,
          scoreThreshold: validatedData.scoreThreshold,
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to search';
        fastify.log.error('Search error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections/:id/retrieve-context - Retrieve context for generation
  fastify.post<{
    Params: CollectionParams;
    Body: RetrieveContextRequest;
  }>(
    '/embeddings/collections/:id/retrieve-context',
    {
      schema: swaggerSchemas.retrieveContext,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = RetrieveContextRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        const vectorStore = await indexingService.initVectorStore(
          collectionConfig.name,
          collectionConfig.isSystemCollection ?? false,
          workspaceContext.slug,
          authContext.user.id
        );

        // Retrieve context
        const result = await retrievalService.retrieveContext(
          vectorStore,
          validatedData.query,
          {
            maxDocuments: validatedData.maxDocuments,
            scoreThreshold: validatedData.scoreThreshold,
            includeMetadata: validatedData.includeMetadata,
            maxTokens: validatedData.maxTokens,
          },
          collectionConfig.name
        );

        // Log analytics
        analyticsService.logVectorRetrieval('context_retrieved', {
          query: validatedData.query,
          sourcesCount: result.sources.length,
          estimatedTokens: result.totalTokens,
          collectionName: collectionConfig.name,
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to retrieve context';
        fastify.log.error('Retrieve context error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections/:id/create - Create single embedding using collection's model
  fastify.post<{
    Params: CollectionParams;
    Body: CreateEmbeddingRequest;
  }>(
    '/embeddings/collections/:id/create',
    {
      schema: swaggerSchemas.createEmbedding,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = CreateEmbeddingRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        analyticsService.logVectorIndexing('embedding_created', {
          textLength: validatedData.text.length,
          embeddingDimensions: embedding.length,
          collectionName: collectionConfig.name,
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to create embedding';
        fastify.log.error('Create embedding error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/embeddings/collections/:id/create-batch - Create multiple embeddings using collection's model
  fastify.post<{
    Params: CollectionParams;
    Body: CreateEmbeddingsRequest;
  }>(
    '/embeddings/collections/:id/create-batch',
    {
      schema: swaggerSchemas.createEmbeddings,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedData = CreateEmbeddingsRequestSchema.parse(request.body);

        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check access
        const hasAccess = await collectionService.hasAccessToCollection(
          id,
          authContext.user.id,
          workspaceContext.slug
        );

        if (!hasAccess) {
          sendNotFoundError(reply, 'Collection not found', fastify.log);
          return;
        }

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
        analyticsService.logVectorIndexing('embeddings_created', {
          textCount: validatedData.texts.length,
          embeddingDimensions: embeddings[0]?.length || 0,
          collectionName: collectionConfig.name,
        });

        reply.send(result);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create embeddings';
        fastify.log.error('Create embeddings error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
