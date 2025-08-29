import { AgentsManager } from '@/agents';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { analyticsService } from '@/services/analytics';

import { type AgentRequest, AgentRequestSchema } from '@/types/agents';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';

export async function agentRoutes(fastify: FastifyInstance) {
  const agentsManager = new AgentsManager();

  // GET /api/agents - List available agents
  fastify.get('/agents', async (_, reply) => {
    try {
      const agents = agentsManager.listAgents();
      return reply.send(agents);
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
        const authToken = extractAuthToken(request);

        const response = await agentsManager.executeAgent(agentId, {
          message: request.body.message,
          context: request.body.context,
          conversationId: request.body.conversationId,
          metadata: request.body.metadata,
          authToken,
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

        return reply.send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Agent execution error: %s', errorMessage);

        if (errorMessage.includes('not found')) {
          sendNotFoundError(reply, 'Agent not found', fastify.log);
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
        const authToken = extractAuthToken(request);

        const response = await agentsManager.executeAgent(agentId, {
          message: request.body.message,
          context: request.body.context,
          conversationId: request.body.conversationId,
          metadata: request.body.metadata,
          authToken,
        });

        if (response.stream) {
          reply.type('text/event-stream');
          reply.header('Cache-Control', 'no-cache');
          reply.header('Connection', 'keep-alive');
          reply.header('X-Agent-Id', agentId);

          // Add conversation ID to response headers if available
          if (request.body.conversationId) {
            reply.header('X-Conversation-Id', request.body.conversationId);
          }

          // Handle LangChain stream directly
          try {
            for await (const chunk of response.stream) {
              const content = chunk.content;
              if (content && typeof content === 'string') {
                reply.raw.write(`data: ${content}\n\n`);
              }
            }
            reply.raw.write('data: [DONE]\n\n');
            reply.raw.end();
          } catch (error) {
            reply.raw.write(
              `data: {"error": "${error instanceof Error ? error.message : 'Stream error'}"}\n\n`
            );
            reply.raw.end();
          }
        } else {
          return reply.send(response);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Agent streaming error: %s', errorMessage);

        if (errorMessage.includes('not found')) {
          sendNotFoundError(reply, 'Agent not found', fastify.log);
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

        return reply.send(config);
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

  // GET /api/agents/models - Get available models
  fastify.get('/agents/models', async (_, reply) => {
    try {
      const models = agentsManager.getAvailableModels();
      return reply.send(models);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch models';
      fastify.log.error('Models error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });

  // GET /api/agents/mcp/status - Get MCP status
  fastify.get('/agents/mcp/status', async (_, reply) => {
    try {
      const status = agentsManager.getMcpStatus();
      return reply.send(status);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch MCP status';
      fastify.log.error('MCP status error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });

  // GET /api/agents/health - Health check for agents
  fastify.get('/agents/health', async (_, reply) => {
    try {
      const agents = agentsManager.listAgents();
      const mcpStatus = agentsManager.getMcpStatus();
      const models = agentsManager.getAvailableModels();

      const response = {
        status: 'healthy',
        agentsCount: agents.length,
        agents: agents.map((a) => ({ id: a.id, name: a.name, type: a.type })),
        mcp: mcpStatus,
        modelsCount: Object.values(models).flat().length,
      };

      return reply.send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to check agent health';
      fastify.log.error('Agent health error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });
}

/**
 * Extract JWT token from request headers
 */
function extractAuthToken(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}
