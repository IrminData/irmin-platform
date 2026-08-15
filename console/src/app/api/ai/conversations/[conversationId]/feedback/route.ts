import { NextRequest, NextResponse } from 'next/server';

import { ConversationsClient } from '@/lib/ai/ConversationsClient';

import { resolveToken } from '../../../utils/resolveToken';

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

function workspaceSlug(req: NextRequest): string | undefined {
  return req.headers.get('x-workspace-slug') ?? undefined;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  const workspace = workspaceSlug(req);
  if (!workspace)
    return NextResponse.json(
      { error: 'Workspace is required' },
      { status: 400 }
    );
  try {
    const client = new ConversationsClient(await resolveToken(req), workspace);
    return NextResponse.json(await client.getFeedback(conversationId));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load feedback',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { conversationId } = await params;
  const workspace = workspaceSlug(req);
  if (!workspace)
    return NextResponse.json(
      { error: 'Workspace is required' },
      { status: 400 }
    );
  try {
    const body = (await req.json()) as {
      messageId: string;
      runId?: string;
      rating: 1 | -1;
      reason?: string;
    };
    if (!body.messageId || (body.rating !== 1 && body.rating !== -1)) {
      return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    }
    const client = new ConversationsClient(await resolveToken(req), workspace);
    return NextResponse.json(
      await client.setFeedback(conversationId, body.messageId, body)
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to save feedback',
      },
      { status: 500 }
    );
  }
}
