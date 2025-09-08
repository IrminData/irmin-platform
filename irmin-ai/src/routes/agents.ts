import { AgentsManager } from '@/agents';
import { db, messages } from '@/database';
import { desc, eq } from 'drizzle-orm';
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
  createStoredUIMessageStream,
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
          conversationId: agentRequest.conversationId ?? '', // The actual conversation creation, if needed, will be handled in the agents manager
          metadata: {
            ...agentRequest.metadata,
            streaming: false, // Non-streaming request
          },
          toolSelection: agentRequest.toolSelection,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
          messageHistoryLimit: agentRequest.messageHistoryLimit,
        });

        // Add conversation ID to response headers if available
        if (response.conversationId) {
          reply.header('X-Conversation-Id', response.conversationId);
        }

        sendOkResponse(
          reply,
          AgentResponseSchema,
          response.agentResponse,
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

        // Capture start time at the beginning of the request for accurate processing time
        const requestStartTime = Date.now();

        // Fetch conversation history AFTER the user message is saved to include it
        // This ensures we get the complete conversation context including the current user message
        let conversationHistory: (typeof messages.$inferSelect)[] = [];
        if (agentRequest.conversationId) {
          conversationHistory = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, agentRequest.conversationId))
            .orderBy(desc(messages.createdAt))
            .limit(agentRequest.messageHistoryLimit || 20);

          // Reverse the history to chronological order for LLM processing
          conversationHistory = conversationHistory.reverse();
        }

        const response = await agentsManager.executeAgent(agentId, {
          message: agentRequest.message,
          context: agentRequest.context,
          conversationId: agentRequest.conversationId ?? '', // The actual conversation creation, if needed, will be handled in the agents manager
          metadata: {
            ...agentRequest.metadata,
            streaming: true, // Streaming request
          },
          toolSelection: agentRequest.toolSelection,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
          messageHistoryLimit: agentRequest.messageHistoryLimit,
        });

        if (response.agentResponse.stream) {
          // Add custom and streaming-friendly headers
          applyStreamingHeaders(reply, {
            'X-Agent-Id': agentId,
            ...(response.conversationId
              ? { 'X-Conversation-Id': response.conversationId }
              : {}),
            ...(response.userMessageId
              ? { 'X-Message-Id': response.userMessageId }
              : {}),
          });

          // Get the agent info for model details
          const agent = agentsManager
            .listAgents()
            .find((a) => a.id === agentId);

          // Use regular UI message stream handler for all streams
          const readableStream = createStoredUIMessageStream(
            response.agentResponse.stream,
            {
              conversationId: response.conversationId,
              modelProvider: agent?.modelProvider,
              model: agent?.model,
              agentName: agent?.name,
              history: conversationHistory,
              startTime: requestStartTime,
              userMessage: agentRequest.message,
              user: authContext.user,
              workspace: workspaceContext.workspace,
            }
          );

          // Return streaming response
          return reply.send(readableStream);
        } else {
          sendOkResponse(
            reply,
            AgentResponseSchema,
            response.agentResponse,
            fastify.log
          );
          return;
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
