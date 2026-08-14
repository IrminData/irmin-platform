/* eslint-disable import-x/no-unused-modules -- Public agent runtime module. */
import { conversations, db } from '@/database';
import { MODEL_PROFILE } from '@/inference';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import agentService from '@/services/agent';
import { titleGenerationService } from '@/services/titleGeneration';

import type { AgentInput } from '@/agents/types';

export type Conversation = typeof conversations.$inferSelect;

/** Owns relational conversation metadata and LangGraph thread lifecycle. */
export class ConversationStore {
  async getOrCreate(agentId: string, input: AgentInput): Promise<Conversation> {
    if (input.conversationId) {
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.workspaceSlug, input.workspace.slug),
            eq(conversations.userId, input.user.id)
          )
        )
        .limit(1);
      if (!existing.length) throw new Error('Conversation not found');
      const conversation = existing[0];
      if (conversation.agentId && conversation.agentId !== agentId) {
        throw new Error(
          `This conversation is associated with agent '${conversation.agentId}' and cannot be used with agent '${agentId}'`
        );
      }
      const context = mergeContext(conversation.context, input.context);
      const updated = await db
        .update(conversations)
        .set({ agentId, context, updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id))
        .returning();
      return updated[0];
    }

    const now = new Date();
    const conversation: typeof conversations.$inferInsert = {
      id: randomUUID(),
      title: titleGenerationService.createFallbackTitle(),
      titleStatus: 'pending',
      metadata: {},
      context: input.context ?? {},
      agentId,
      runtimeVersion: 1,
      modelProfileVersion: MODEL_PROFILE.version,
      workspaceSlug: input.workspace.slug,
      userId: input.user.id,
      createdAt: now,
      updatedAt: now,
    };
    const created = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return created[0];
  }

  async touch(conversationId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  async delete(conversationId: string): Promise<void> {
    await agentService.deleteThread(conversationId);
    await db.delete(conversations).where(eq(conversations.id, conversationId));
  }
}

function mergeContext(
  stored: unknown,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  const merged =
    typeof stored === 'object' && stored !== null
      ? { ...(stored as Record<string, unknown>) }
      : {};
  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value !== null && value !== undefined && value !== '')
      merged[key] = value;
  }
  return merged;
}

export const conversationStore = new ConversationStore();
