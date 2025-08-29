import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  metadata: text('metadata', { mode: 'json' }),

  // AI model information
  aiModelId: text('ai_model_id'),
  modelProvider: text('model_provider'), // 'openai', 'groq', etc.
  modelName: text('model_name'),

  // Agent information
  agentName: text('agent_name'), // Name of the agent that generated this message

  // Token usage and costs
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  costUSD: real('cost_dollars').default(0),

  // Performance metrics
  processingTimeMs: integer('processing_time_ms').default(0),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const aiModels = sqliteTable('ai_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  provider: text('provider').notNull(), // 'openai', 'groq', etc.
  modelId: text('model_id').notNull().unique(), // actual model identifier
  description: text('description').notNull(), // model description

  // Pricing information (per 1M tokens)
  inputPricePerMillionTokens: real('input_price_per_million_tokens').default(0),
  outputPricePerMillionTokens: real('output_price_per_million_tokens').default(
    0
  ),

  // Metadata
  metadata: text('metadata', { mode: 'json' }),

  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const analytics = sqliteTable('analytics', {
  id: text('id').primaryKey(),

  // Event information
  eventType: text('event_type', {
    enum: [
      'conversation_created',
      'conversation_updated',
      'conversation_deleted',
      'message_sent',
      'agent_used',
      'model_used',
      'error_occurred',
    ],
  }).notNull(),
  eventData: text('event_data', { mode: 'json' }),

  // Optional references
  conversationId: text('conversation_id').references(() => conversations.id, {
    onDelete: 'cascade',
  }),
  messageId: text('message_id').references(() => messages.id, {
    onDelete: 'cascade',
  }),
  aiModelId: integer('ai_model_id').references(() => aiModels.id, {
    onDelete: 'set null',
  }),

  // Metrics
  tokenCount: integer('token_count').default(0),
  costUSD: real('cost_dollars').default(0),
  processingTimeMs: integer('processing_time_ms').default(0),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Export types
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type AIModel = typeof aiModels.$inferSelect;
export type NewAIModel = typeof aiModels.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;
