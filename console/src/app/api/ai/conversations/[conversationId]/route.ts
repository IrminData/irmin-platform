import { NextRequest, NextResponse } from 'next/server';

import { ConversationsClient } from '@/lib/ai/ConversationsClient';

import { resolveToken } from '../../utils/resolveToken';

interface RouteParams {
  params: Promise<{
    conversationId: string;
  }>;
}

/**
 * DELETE /api/ai/conversations/[conversationId]
 * Proxies delete request to AI service to avoid CORS issues
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const workspaceSlug = req.headers.get('x-workspace-slug');

    if (!workspaceSlug) {
      return NextResponse.json(
        { error: 'X-Workspace-Slug header is required' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const token = await resolveToken(req);
    const client = new ConversationsClient(token, workspaceSlug);

    await client.deleteConversation(conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error deleting AI conversation', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('Error deleting AI conversation', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
