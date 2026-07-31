import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { ConversationsClient } from '@/lib/ai/ConversationsClient';

import { resolveToken } from '../utils/resolveToken';

const ConversationMessagesQuerySchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  workspaceSlug: z.string().min(1, 'workspaceSlug is required'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsedQuery = ConversationMessagesQuerySchema.parse({
      conversationId: queryParams.conversationId,
      workspaceSlug: queryParams.workspaceSlug,
    });

    const { conversationId, workspaceSlug } = parsedQuery;

    const token = await resolveToken(req);
    const client = new ConversationsClient(token, workspaceSlug);

    const messages = await client.getConversationMessages(conversationId);

    return NextResponse.json(messages);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error('Error fetching AI conversation messages', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('Error fetching AI conversation messages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
