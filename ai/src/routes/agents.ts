import { AgentsManager } from '@/agents';
import { conversations, db, modelRuns } from '@/database';
import { MODEL_PROFILE } from '@/inference';
import { createRunEventStream } from '@/protocol/runEvents';
import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';

import { titleGenerationService } from '@/services/titleGeneration';
import { reportAIUsage } from '@/services/usageReporter';

import type { AgentInput } from '@/agents/types';

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
import { applyStreamingHeaders } from '@/utils/streaming';

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

        // Report AI usage (fire-and-forget)
        reportAIUsage(workspaceContext.workspace.id).catch(() => undefined);

        // Add conversation ID to response headers
        reply.header('X-Conversation-Id', response.conversationId);
        reply.header('X-Agent-Id', agentId);

        sendOkResponse(
          reply,
          AgentResponseSchema,
          {
            conversationId: response.conversationId,
            metadata: response.agentResponse.metadata,
            specialistResult: response.agentResponse.specialistResult,
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
      const startedAt = Date.now();

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
      const { agentId } = request.params;
      const runController = new AbortController();
      const abortRun = () => {
        if (!runController.signal.aborted) {
          runController.abort(
            new DOMException('Client disconnected', 'AbortError')
          );
        }
      };
      request.raw.once('aborted', abortRun);
      reply.raw.once('close', () => {
        if (!reply.raw.writableEnded) abortRun();
      });

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
      const agentInput: AgentInput = {
        message: agentRequest.message,
        context: agentRequest.context,
        conversationId: agentRequest.conversationId,
        authToken,
        workspace: workspaceContext.workspace,
        user: authContext.user,
        signal: runController.signal,
      };

      let conversation: { id: string };
      try {
        const result = await agentsManager.getOrCreateConversation(
          agentId,
          agentInput
        );
        conversation = result.conversation;
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

      const runId = ulid();
      agentInput.runId = runId;
      await db
        .update(conversations)
        .set({
          runtimeVersion: 1,
          modelProfileVersion: MODEL_PROFILE.version,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));
      await db.insert(modelRuns).values({
        runId,
        conversationId: conversation.id,
        workspaceSlug: workspaceContext.workspace.slug,
        userId: authContext.user.id,
        role: 'assistant',
        profileVersion: MODEL_PROFILE.version,
        status: 'running',
      });

      let firstTokenRecorded = false;
      let assistantText = '';
      const runStream = createRunEventStream({
        runId,
        agentId,
        conversationId: conversation.id,
        signal: runController.signal,
        onCancel: abortRun,
        source: async () => {
          const response = await agentsManager.executeAgent(
            agentId,
            agentInput,
            conversation as Awaited<
              ReturnType<typeof agentsManager.getOrCreateConversation>
            >['conversation']
          );
          reportAIUsage(workspaceContext.workspace.id).catch(() => undefined);
          if (!response.agentResponse.stream) {
            throw new Error('Agent did not return a stream');
          }
          return response.agentResponse.stream;
        },
        onEvent: async (event) => {
          if (event.type === 'message.delta') {
            const delta = (event.data as { delta?: unknown }).delta;
            if (typeof delta === 'string') assistantText += delta;
          }
          if (event.type === 'message.delta' && !firstTokenRecorded) {
            firstTokenRecorded = true;
            await db
              .update(modelRuns)
              .set({ timeToFirstTokenMs: Date.now() - startedAt })
              .where(eq(modelRuns.runId, runId));
            return;
          }

          if (
            event.type === 'run.completed' ||
            event.type === 'run.failed' ||
            event.type === 'run.cancelled'
          ) {
            await db
              .update(modelRuns)
              .set({
                status: event.type.slice('run.'.length),
                messageId:
                  event.type === 'run.completed'
                    ? (event.data as { messageId?: string }).messageId
                    : undefined,
                latencyMs: Date.now() - startedAt,
                errorCode:
                  event.type === 'run.failed' ? 'internal_error' : undefined,
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(modelRuns.runId, runId));
            if (event.type === 'run.completed') {
              void titleGenerationService
                .updateConversationTitleIfNeeded(conversation.id, {
                  message: agentRequest.message,
                  aiResponse: assistantText,
                  user: authContext.user,
                  workspace: workspaceContext.workspace,
                  signal: runController.signal,
                })
                .catch((error: unknown) => {
                  fastify.log.warn(
                    { error, conversationId: conversation.id },
                    'Conversation title generation failed'
                  );
                });
            }
          }
        },
      });

      applyStreamingHeaders(reply, {
        'X-Agent-Id': agentId,
        'X-Conversation-Id': conversation.id,
        'X-Run-Id': runId,
      });
      return reply.send(runStream);
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
