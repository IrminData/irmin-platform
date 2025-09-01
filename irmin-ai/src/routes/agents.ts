import { AgentsManager } from '@/agents';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { analyticsService } from '@/services/analytics';

import {
  AgentConfigSchema,
  type AgentRequest,
  AgentRequestSchema,
  AgentResponseSchema,
  ListAgentsResponseSchema,
} from '@/types/agents';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';

export async function agentRoutes(fastify: FastifyInstance) {
  const agentsManager = new AgentsManager();

  // GET /api/agents - List available agents
  fastify.get('/agents', async (_, reply) => {
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
  });

  // POST /api/agents/:agentId - Execute a single agent (non-streaming)
  fastify.post<{ Params: { agentId: string }; Body: AgentRequest }>(
    '/agents/:agentId',
    {
      schema: {
        params: zodToJsonSchema(
          z.object({
            agentId: z.string().min(1, 'Agent ID is required'),
          })
        ),
        body: zodToJsonSchema(AgentRequestSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { agentId: string };
        Body: AgentRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { agentId } = request.params;
        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        const response = await agentsManager.executeAgent(agentId, {
          message: request.body.message,
          context: request.body.context,
          conversationId: request.body.conversationId,
          metadata: {
            ...request.body.metadata,
            streaming: false, // Non-streaming request
          },
          toolSelection: request.body.toolSelection,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
        });

        // Add conversation ID to response headers if available
        if (request.body.conversationId) {
          reply.header('X-Conversation-Id', request.body.conversationId);
        }

        // Log successful API request
        analyticsService
          .logCustomEvent({
            eventType: 'model_used',
            conversationId: request.body.conversationId,
            eventData: { agentId, success: true },
          })
          .catch((error: unknown) => {
            fastify.log.warn(
              'Analytics logging failed: %s',
              error instanceof Error ? error.message : 'Unknown error'
            );
          });

        sendOkResponse(reply, AgentResponseSchema, response, fastify.log);
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
      schema: {
        params: zodToJsonSchema(
          z.object({
            agentId: z.string().min(1, 'Agent ID is required'),
          })
        ),
        body: zodToJsonSchema(AgentRequestSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { agentId: string };
        Body: AgentRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { agentId } = request.params;
        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        const response = await agentsManager.executeAgent(agentId, {
          message: request.body.message,
          context: request.body.context,
          conversationId: request.body.conversationId,
          metadata: {
            ...request.body.metadata,
            streaming: true, // Streaming request
          },
          toolSelection: request.body.toolSelection,
          authToken,
          workspace: workspaceContext.workspace,
          user: authContext.user,
        });

        if (response.stream) {
          // Add custom headers
          reply.header('X-Agent-Id', agentId);
          if (request.body.conversationId) {
            reply.header('X-Conversation-Id', request.body.conversationId);
          }

          // Use Vercel's AI SDK to convert the stream to a UI message stream
          const uiMessageStream = toUIMessageStream(response.stream);

          // Convert the UI message stream to a format that Fastify can handle
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                // Consume the UI message stream and convert it to chunks
                for await (const chunk of uiMessageStream) {
                  if (chunk && typeof chunk === 'object') {
                    // Convert the chunk to a JSON string
                    const chunkData = JSON.stringify(chunk);
                    controller.enqueue(
                      new TextEncoder().encode(chunkData + '\n')
                    );
                  }
                }
                controller.close();
              } catch (error) {
                console.error('Error processing UI message stream:', error);
                controller.error(error);
              }
            },
          });

          // Return streaming response
          return reply.send(readableStream);
        } else {
          sendOkResponse(reply, AgentResponseSchema, response, fastify.log);
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
      schema: {
        params: zodToJsonSchema(
          z.object({
            agentId: z.string().min(1, 'Agent ID is required'),
          })
        ),
      },
    },
    async (
      request: FastifyRequest<{ Params: { agentId: string } }>,
      reply: FastifyReply
    ) => {
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
