import { aiModels, db } from '@/database';
import { eq } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { mcpService } from '@/services/mcp';

import {
  McpToolsResponseSchema,
  ModelsResponseSchema,
  UserProfileResponseSchema,
  WorkspaceInfoResponseSchema,
} from '@/types/info';

import { sendInternalServerError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';

export async function infoRoutes(fastify: FastifyInstance) {
  // GET /api/info/user - Get authenticated user profile
  fastify.get(
    '/info/user',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get authenticated user context (set by middleware)
        const authContext = request.auth;
        if (!authContext) {
          throw new Error('Authentication context required');
        }

        sendOkResponse(
          reply,
          UserProfileResponseSchema,
          {
            user: authContext.user,
            token: authContext.token,
          },
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch user profile';
        fastify.log.error('User profile endpoint error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/info/workspace - Get selected workspace information
  fastify.get(
    '/info/workspace',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get workspace context (set by middleware)
        const workspaceContext = request.workspace;
        if (!workspaceContext) {
          throw new Error('Workspace context required');
        }

        sendOkResponse(
          reply,
          WorkspaceInfoResponseSchema,
          {
            workspace: workspaceContext.workspace,
            slug: workspaceContext.slug,
          },
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch workspace information';
        fastify.log.error('Workspace info endpoint error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/info/models - List available AI models
  fastify.get('/info/models', async (_, reply: FastifyReply) => {
    try {
      // Get models from database with pricing and capabilities
      const dbModels = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.isActive, true));

      // Transform to match expected format
      const models = dbModels.map((model) => ({
        name: model.name,
        provider: model.provider,
        modelId: model.modelId,
        description: model.description,
        inputPricePerMillionTokens: model.inputPricePerMillionTokens,
        outputPricePerMillionTokens: model.outputPricePerMillionTokens,
      }));

      sendOkResponse(reply, ModelsResponseSchema, { models }, fastify.log);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch models';
      fastify.log.error('Models endpoint error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });

  // GET /api/info/tools - List available MCP tools
  fastify.get(
    '/info/tools',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        const mcpTools = await mcpService.getTools(authToken);

        sendOkResponse(
          reply,
          McpToolsResponseSchema,
          {
            enabled: mcpTools.enabled,
            tools: mcpTools.tools,
            count: mcpTools.count,
            servers: mcpTools.servers,
            totalServers: mcpTools.totalServers,
          },
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch tools';
        fastify.log.error('Tools endpoint error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
