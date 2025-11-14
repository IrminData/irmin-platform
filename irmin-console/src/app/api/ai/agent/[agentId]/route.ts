import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { AgentsClient } from '@/lib/ai/AgentsClient';

import { AIAgentExecuteRequestSchema } from '@/types/ai/requests';

import { resolveToken } from '../../utils/resolveToken';

const AgentIdParamsSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
});

const AgentExecuteQuerySchema = z.object({
  workspaceSlug: z.string().min(1, 'workspaceSlug is required'),
});

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const { agentId } = AgentIdParamsSchema.parse(await context.params);
    const parsedQuery = AgentExecuteQuerySchema.parse({
      workspaceSlug: queryParams.workspaceSlug,
    });

    const { workspaceSlug } = parsedQuery;

    const token = await resolveToken(req);
    const client = new AgentsClient(token, workspaceSlug);

    const config = await client.getAgentConfig(agentId);

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error('Error fetching agent config', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('Error fetching agent config', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const { agentId } = AgentIdParamsSchema.parse(await context.params);
    const parsedQuery = AgentExecuteQuerySchema.parse({
      workspaceSlug: queryParams.workspaceSlug,
    });

    const { workspaceSlug } = parsedQuery;

    const body = await req.json();
    const executeRequest = AIAgentExecuteRequestSchema.parse(body);

    const token = await resolveToken(req);
    const client = new AgentsClient(token, workspaceSlug);

    // Get agent config to check if streaming is supported
    const config = await client.getAgentConfig(agentId);

    // If agent supports streaming, use stream endpoint
    if (config.supportsStreaming) {
      const { stream, conversationId } = await client.executeAgentStream(
        agentId,
        executeRequest
      );

      // Create a ReadableStream response
      const response = new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          ...(conversationId && { 'X-Conversation-Id': conversationId }),
        },
      });

      return response;
    }

    // Otherwise, use non-streaming endpoint
    const { data, conversationId } = await client.executeAgent(
      agentId,
      executeRequest
    );

    return NextResponse.json(data, {
      headers: {
        ...(conversationId && { 'X-Conversation-Id': conversationId }),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error('Error executing agent', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('Error executing agent', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
