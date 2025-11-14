import { AgentsManager } from '@/agents';
import { FastifyInstance } from 'fastify';

import { swaggerSchemas } from '@/config/swagger';

import {
  AgentConfigSchema,
  type AgentRequest,
  AgentRequestSchema,
  AgentResponseSchema,
  ListAgentsResponseSchema,
} from '@/types/agents';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';
import {
  applyStreamingHeaders,
  stringifyLangChainStream,
} from '@/utils/streaming';

export async function agentRoutes(fastify: FastifyInstance) {
  const agentsManager = new AgentsManager();

  // GET /api/agents - List available agents
  fastify.get(
    '/agents',
    {
      schema: swaggerSchemas.listAgents,
    },
    async (_, reply) => {
      try {
        const agents = agentsManager.listAgents();
        const response = { agents };
        sendOkResponse(reply, ListAgentsResponseSchema, response, fastify.log);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch agents';
        fastify.log.error('Agents list error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/agents/:agentId - Execute a single agent (non-streaming)
  fastify.post<{ Params: { agentId: string }; Body: AgentRequest }>(
    '/agents/:agentId',
    {
      schema: swaggerSchemas.executeAgent,
    },
    async (request, reply) => {
      try {
        const agentRequest = AgentRequestSchema.parse(request.body);
        const { agentId } = request.params;

        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        const response = await agentsManager.executeAgent(agentId, {
          message: agentRequest.message,
          context: agentRequest.context,
          conversationId: agentRequest.conversationId,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
        });

        // Serialize LangChain messages using their toDict method
        const serializedMessages =
          response.agentResponse.messages?.map((message) => message.toDict()) ??
          [];

        // Add conversation ID to response headers
        reply.header('X-Conversation-Id', response.conversationId);
        reply.header('X-Agent-Id', agentId);

        sendOkResponse(
          reply,
          AgentResponseSchema,
          {
            ...response.agentResponse,
            messages: serializedMessages,
          },
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Agent execution error: %s', errorMessage);

        if (errorMessage.includes('Conversation not found')) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        if (errorMessage.includes('Agent not found')) {
          sendNotFoundError(reply, 'Agent not found', fastify.log);
          return;
        }

        if (errorMessage.includes('not found')) {
          sendNotFoundError(reply, 'Resource not found', fastify.log);
          return;
        }

        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/agents/:agentId/stream - Execute a single agent with streaming
  fastify.post<{ Params: { agentId: string }; Body: AgentRequest }>(
    '/agents/:agentId/stream',
    {
      schema: swaggerSchemas.executeAgentStream,
    },
    async (request, reply) => {
      try {
        const agentRequest = AgentRequestSchema.parse(request.body);
        const { agentId } = request.params;

        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        const response = await agentsManager.executeAgent(agentId, {
          message: agentRequest.message,
          context: agentRequest.context,
          conversationId: agentRequest.conversationId,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
        });

        if (response.agentResponse.stream) {
          // Add streaming headers
          applyStreamingHeaders(reply, {
            'X-Conversation-Id': response.conversationId,
            'X-Agent-Id': agentId,
          });

          // Convert LangChain stream to string stream for Fastify
          const textStream = stringifyLangChainStream(
            response.agentResponse.stream
          );

          return reply.send(textStream);
        } else {
          throw new Error('Agent response is not a stream');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Agent streaming error: %s', errorMessage);

        if (errorMessage.includes('Conversation not found')) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        if (errorMessage.includes('Agent not found')) {
          sendNotFoundError(reply, 'Agent not found', fastify.log);
          return;
        }

        if (errorMessage.includes('not found')) {
          sendNotFoundError(reply, 'Resource not found', fastify.log);
          return;
        }

        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/agents/:agentId/config - Get agent configuration
  fastify.get<{ Params: { agentId: string } }>(
    '/agents/:agentId/config',
    {
      schema: swaggerSchemas.agentConfig,
    },
    async (request, reply) => {
      try {
        const { agentId } = request.params;
        const config = agentsManager.getAgentConfig(agentId);

        if (!config) {
          sendNotFoundError(reply, 'Agent not found', fastify.log);
          return;
        }

        sendOkResponse(reply, AgentConfigSchema, config, fastify.log);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch agent config';
        fastify.log.error('Agent config error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
