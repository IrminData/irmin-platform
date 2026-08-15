import { MODEL_PROFILE } from '@/inference';
import { FastifyInstance } from 'fastify';

import { swaggerSchemas } from '@/config/swagger';

import {
  ModelProfileResponseSchema,
  UserProfileResponseSchema,
  WorkspaceInfoResponseSchema,
} from '@/types/info';

import { sendInternalServerError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';

export async function infoRoutes(fastify: FastifyInstance) {
  // GET /api/info/user - Get authenticated user profile
  fastify.get(
    '/info/user',
    {
      schema: swaggerSchemas.userProfile,
    },
    async (request, reply) => {
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
    {
      schema: swaggerSchemas.workspaceInfo,
    },
    async (request, reply) => {
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

  fastify.get(
    '/info/model-profile',
    { schema: swaggerSchemas.modelProfile },
    async (_, reply) => {
      sendOkResponse(
        reply,
        ModelProfileResponseSchema,
        {
          profile: {
            ...MODEL_PROFILE,
            providerAllowlist: [...MODEL_PROFILE.providerAllowlist],
            roles: Object.fromEntries(
              Object.entries(MODEL_PROFILE.roles).map(([role, value]) => [
                role,
                {
                  primaryModel: value.primaryModel,
                  fallbackModels: [...value.fallbackModels],
                  capabilities: value.capabilities,
                  maxInputTokens: value.maxInputTokens,
                  maxOutputTokens: value.maxOutputTokens,
                  timeoutMs: value.timeoutMs,
                },
              ])
            ),
          },
        },
        fastify.log
      );
    }
  );
}
