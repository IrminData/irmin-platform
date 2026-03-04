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
import { applyStreamingHeaders, createDeferredStream } from '@/utils/streaming';

export async function agentRoutes(fastify: FastifyInstance) {
  const agentsManager = (
    fastify as FastifyInstance & { agentsManager: AgentsManager }
  ).agentsManager;

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
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
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
  // Uses stream-first architecture: sends headers immediately, then pipes agent output
  fastify.post<{ Params: { agentId: string }; Body: AgentRequest }>(
    '/agents/:agentId/stream',
    {
      schema: swaggerSchemas.executeAgentStream,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const timings = {
        start: Date.now(),
        validated: 0,
        conversationReady: 0,
        streamStarted: 0,
        agentReady: 0,
        firstChunk: 0,
      };

      // Parse and validate request early (fast, synchronous)
      let agentRequest: AgentRequest;
      try {
        agentRequest = AgentRequestSchema.parse(request.body);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Invalid request';
        fastify.log.error('Agent request validation error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
      timings.validated = Date.now();

      const { agentId } = request.params;

      // Get authenticated user and workspace context (set by middleware)
      const authContext = request.auth;
      const workspaceContext = request.workspace;
      if (!authContext || !workspaceContext) {
        sendInternalServerError(
          reply,
          'Authentication and workspace context required',
          fastify.log
        );
        return;
      }
      const authToken = authContext.token;

      // Get or create conversation FIRST so we can include the ID in headers
      // This adds ~10-50ms but provides better client compatibility
      const agentInput = {
        message: agentRequest.message,
        context: agentRequest.context,
        conversationId: agentRequest.conversationId,
        authToken,
        workspace: workspaceContext.workspace,
        user: authContext.user,
      };

      let conversation: { id: string };
      try {
        const result = await agentsManager.getOrCreateConversation(
          agentId,
          agentInput
        );
        conversation = result.conversation;
        timings.conversationReady = Date.now();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create conversation';
        fastify.log.error('Conversation creation error: %s', errorMessage);

        // Return 404 for not-found errors, 500 for others
        const isNotFound =
          errorMessage.includes('not found') ||
          errorMessage.includes('not exist');
        if (isNotFound) {
          sendNotFoundError(reply, errorMessage, fastify.log);
        } else {
          sendInternalServerError(reply, errorMessage, fastify.log);
        }
        return;
      }

      // STREAM-FIRST: Create deferred stream and send headers with conversation ID
      const deferredStream = createDeferredStream();

      applyStreamingHeaders(reply, {
        'X-Agent-Id': agentId,
        'X-Conversation-Id': conversation.id,
      });

      // Send the readable stream to the client immediately
      reply.send(deferredStream.readable);
      timings.streamStarted = Date.now();

      // Push initial "thinking" event so client knows we're processing
      deferredStream.pushEvent({
        event: 'stream_start',
        data: {
          status: 'initializing',
          agentId,
          conversationId: conversation.id,
          message: 'Agent is preparing...',
        },
      });

      fastify.log.info(
        `[Agent Timing] Stream started: validation=${timings.validated - timings.start}ms, conversation=${timings.conversationReady - timings.validated}ms, total=${timings.streamStarted - timings.start}ms`
      );

      // Execute agent in background and pipe results to the deferred stream
      // Pass the pre-created conversation to avoid duplicate DB calls
      (async () => {
        try {
          const response = await agentsManager.executeAgent(
            agentId,
            agentInput,
            conversation as Awaited<
              ReturnType<typeof agentsManager.getOrCreateConversation>
            >['conversation']
          );
          timings.agentReady = Date.now();

          fastify.log.info(
            `[Agent Timing] Agent ready: agentExecution=${timings.agentReady - timings.streamStarted}ms, totalToAgent=${timings.agentReady - timings.start}ms`
          );

          // Push metadata event (conversation ID already in headers, but also in stream for compatibility)
          deferredStream.pushEvent({
            event: 'metadata',
            data: {
              conversationId: response.conversationId,
              agentId,
            },
          });

          if (response.agentResponse.stream) {
            // Pipe the agent's stream to the deferred stream
            fastify.log.info(
              `[Agent Timing] Starting stream pipe: timeToStreamStart=${Date.now() - timings.start}ms`
            );
            await deferredStream.pipeFrom(response.agentResponse.stream, () => {
              timings.firstChunk = Date.now();
              fastify.log.info(
                `[Agent Timing] First LLM token received: timeToFirstToken=${timings.firstChunk - timings.start}ms`
              );
            });
          } else {
            // Non-streaming response - push messages as single event
            deferredStream.pushEvent({
              event: 'agent_response',
              data: {
                messages: response.agentResponse.messages?.map((m) =>
                  m.toDict()
                ),
                metadata: response.agentResponse.metadata,
              },
            });
          }

          // Signal completion
          deferredStream.pushEvent({
            event: 'stream_end',
            data: { status: 'complete' },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          fastify.log.error('Agent streaming error: %s', errorMessage);

          // Push sanitized error event to the stream (avoid leaking stack traces or internal details)
          const isNotFound = errorMessage.includes('not found');
          deferredStream.pushEvent({
            event: 'error',
            data: {
              message: isNotFound
                ? errorMessage
                : 'An internal error occurred while processing your request',
              type: isNotFound ? 'not_found' : 'internal_error',
            },
          });
        } finally {
          // Always close the stream when done
          deferredStream.close();
        }
      })();

      // Return reply to signal Fastify we're handling the response (keeps stream open)
      return reply;
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
